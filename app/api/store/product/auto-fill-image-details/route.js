import { NextResponse } from "next/server";
import { getAuth } from "@/lib/firebase-admin";
import authSeller from "@/middlewares/authSeller";
import { ensureOpenAI, isOpenAIConfigured } from "@/configs/openai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const sanitizeString = (value, maxLength = 5000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const sanitizeStringArray = (value, maxItems = 12, maxLength = 80) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => sanitizeString(String(item || ""), maxLength))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
};

const sanitizeIdArray = (value, maxItems = 6) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => sanitizeString(String(item || ""), 80))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
};

const sanitizeMobileSpecs = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((item) => ({
      label: sanitizeString(item?.label, 120),
      value: sanitizeString(item?.value, 300),
    }))
    .filter((item) => item.label && item.value);
};

const parseModelJson = (rawText) => {
  if (!rawText) return {};

  try {
    return JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return {};
    try {
      return JSON.parse(rawText.slice(start, end + 1));
    } catch {
      return {};
    }
  }
};

const isValidHttpUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const fetchExternalReferenceImages = async (searchTerm) => {
  const term = sanitizeString(searchTerm, 80);
  if (!term) return [];

  try {
    const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
    endpoint.searchParams.set("action", "query");
    endpoint.searchParams.set("generator", "search");
    endpoint.searchParams.set("gsrsearch", `filetype:bitmap ${term}`);
    endpoint.searchParams.set("gsrnamespace", "6");
    endpoint.searchParams.set("gsrlimit", "6");
    endpoint.searchParams.set("prop", "imageinfo");
    endpoint.searchParams.set("iiprop", "url");
    endpoint.searchParams.set("format", "json");

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "Quickfynd-Autofill/1.0",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {});

    return pages
      .map((page) => page?.imageinfo?.[0]?.url)
      .filter((url) => isValidHttpUrl(url))
      .slice(0, 3);
  } catch {
    return [];
  }
};

const ensureDescriptionHtml = (value, shortDescription) => {
  const description = sanitizeString(value, 12000);
  if (/<[a-z][\s\S]*>/i.test(description)) return description;

  const short = sanitizeString(shortDescription, 260);
  const fallback = description || short;
  if (!fallback) return "";
  return `<p>${fallback}</p>`;
};

const appendSpecsTableIfMissing = (descriptionHtml, mobileSpecs) => {
  if (!descriptionHtml) return descriptionHtml;
  if (/<table[\s\S]*?>/i.test(descriptionHtml)) return descriptionHtml;
  if (!Array.isArray(mobileSpecs) || mobileSpecs.length === 0) return descriptionHtml;

  const tableRows = mobileSpecs
    .map((spec) => `<tr><th>${spec.label}</th><td>${spec.value}</td></tr>`)
    .join("");

  const specsTable = [
    '<h3>Specifications</h3>',
    '<table>',
    '<thead><tr><th>Feature</th><th>Details</th></tr></thead>',
    `<tbody>${tableRows}</tbody>`,
    '</table>',
  ].join("");

  return `${descriptionHtml}${specsTable}`;
};

const appendReferenceImages = (descriptionHtml, referenceImages) => {
  if (!descriptionHtml) return descriptionHtml;
  if (!Array.isArray(referenceImages) || referenceImages.length === 0) return descriptionHtml;

  const imagesHtml = referenceImages
    .map((url, index) => {
      if (!isValidHttpUrl(url)) return "";
      return [
        '<figure>',
        `<img src="${url}" alt="Reference image ${index + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`,
        `<figcaption>Reference view ${index + 1}</figcaption>`,
        '</figure>',
      ].join("");
    })
    .filter(Boolean)
    .join("");

  if (!imagesHtml) return descriptionHtml;

  return `${descriptionHtml}<h3>Additional Reference Images</h3>${imagesHtml}`;
};

const classifyCategoriesFromImage = async ({ openai, model, imageContent, availableCategories, imageContext }) => {
  if (!Array.isArray(availableCategories) || availableCategories.length === 0) {
    return [];
  }

  try {
    const categoryListText = availableCategories
      .map((cat) => `- ${cat.id}: ${cat.name}`)
      .join("\n");

    const contextText = imageContext
      ? `Additional product details from seller: ${imageContext}`
      : "No additional seller details provided.";

    const categoryCompletion = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict ecommerce category classifier. Choose only from provided category IDs. Prefer precision over recall.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Classify this product image into categories. Return JSON with keys: primaryCategoryId, secondaryCategoryIds, confidence. Rules: 1) primaryCategoryId must be one id from list. 2) secondaryCategoryIds must contain 0-2 additional ids from list. 3) confidence is number 0-1. 4) If uncertain, keep only primary and no secondary.\n\n${contextText}\n\nAvailable categories:\n${categoryListText}`,
            },
            imageContent,
          ],
        },
      ],
    });

    const raw = categoryCompletion?.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(raw);

    const validIdSet = new Set(availableCategories.map((cat) => cat.id));
    const primary = sanitizeString(parsed?.primaryCategoryId, 80);
    const secondaries = sanitizeIdArray(parsed?.secondaryCategoryIds, 2);
    const confidence = Number(parsed?.confidence);

    const selected = [];
    if (primary && validIdSet.has(primary)) selected.push(primary);
    for (const id of secondaries) {
      if (validIdSet.has(id) && !selected.includes(id)) selected.push(id);
    }

    // Keep automatic selection conservative.
    if (!Number.isFinite(confidence) || confidence < 0.45) {
      return selected.slice(0, 1);
    }

    return selected.slice(0, 3);
  } catch {
    return [];
  }
};

export async function POST(request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "OpenAI is not configured on server" }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let userId;
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image");
    const imageUrl = sanitizeString(formData.get("imageUrl") || "", 1500);
    const availableCategoriesRaw = formData.get("availableCategories");
    const imageContext = sanitizeString(formData.get("imageContext") || "", 600);

    let availableCategories = [];
    if (availableCategoriesRaw) {
      try {
        const parsed = JSON.parse(String(availableCategoriesRaw));
        if (Array.isArray(parsed)) {
          availableCategories = parsed
            .map((cat) => ({
              id: sanitizeString(cat?.id, 80),
              name: sanitizeString(cat?.name, 120),
            }))
            .filter((cat) => cat.id && cat.name)
            .slice(0, 200);
        }
      } catch {
        availableCategories = [];
      }
    }

    if (!imageFile && !imageUrl) {
      return NextResponse.json({ error: "Please provide an image file or imageUrl" }, { status: 400 });
    }

    let imageContent;

    if (imageFile) {
      const mimeType = imageFile.type || "";
      if (!mimeType.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
      }

      if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json({ error: "Image is too large. Max size is 10MB" }, { status: 400 });
      }

      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const base64 = imageBuffer.toString("base64");
      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
        },
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      };
    }

    const openai = ensureOpenAI();
    const model = process.env.OPENAI_PRODUCT_AUTOFILL_MODEL || "gpt-4.1-mini";
    const availableCategoryPrompt = availableCategories.length
      ? `Available categories (use ONLY these, by id):\n${availableCategories
          .map((cat) => `- ${cat.id}: ${cat.name}`)
          .join("\n")}`
      : "No category list provided.";

    const additionalContextPrompt = imageContext
      ? `Additional user-provided details about this product image (treat as high priority if it does not conflict with the image):\n${imageContext}`
      : "No additional user-provided details.";

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate ecommerce product metadata from one product image. Return strict JSON only. Never include brand, deliveredBy, soldBy, paymentInfo, price, or mrp. If uncertain, return empty values. For categories, you must choose only from provided category IDs.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Analyze this product image and return JSON with exactly these keys: name, shortDescription, description, metaTitle, metaDescription, seoKeywords, tags, badges, suggestedCategories, suggestedCategoryIds, sku, stockQuantity, fastDelivery, allowReturn, allowReplacement, mobileSpecsEnabled, mobileSpecs. Rules: 1) description must be clean responsive HTML using <p>, <ul><li>, and include at least one <table> for key specifications when possible. 2) seoKeywords/tags/badges/suggestedCategories are arrays of strings. 3) suggestedCategoryIds must be an array of the BEST 1-3 IDs chosen only from the provided category list. Do not return unrelated IDs. 4) mobileSpecs is array of {label,value}. 5) stockQuantity should default to 100 unless the image strongly indicates another value. 6) Use additional user-provided details when available (for example capacity, pack size, or material). 7) Do not add markdown fences.\n\n${additionalContextPrompt}\n\n${availableCategoryPrompt}`,
            },
            imageContent,
          ],
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const parsed = parseModelJson(raw);

    const classifiedCategoryIds = await classifyCategoriesFromImage({
      openai,
      model,
      imageContent,
      availableCategories,
      imageContext,
    });

    const searchTerm = sanitizeString(
      parsed?.name || parsed?.tags?.[0] || parsed?.seoKeywords?.[0] || "",
      80
    );
    const externalReferenceImages = await fetchExternalReferenceImages(searchTerm);

    const mobileSpecs = sanitizeMobileSpecs(parsed?.mobileSpecs);
    const descriptionHtml = appendReferenceImages(
      appendSpecsTableIfMissing(
        ensureDescriptionHtml(parsed?.description, parsed?.shortDescription),
        mobileSpecs
      ),
      externalReferenceImages
    );

    const fields = {
      name: sanitizeString(parsed?.name, 140),
      shortDescription: sanitizeString(parsed?.shortDescription, 260),
      description: sanitizeString(descriptionHtml, 12000),
      metaTitle: sanitizeString(parsed?.metaTitle, 70),
      metaDescription: sanitizeString(parsed?.metaDescription, 180),
      seoKeywords: sanitizeStringArray(parsed?.seoKeywords, 12, 80),
      tags: sanitizeStringArray(parsed?.tags, 12, 50),
      badges: sanitizeStringArray(parsed?.badges, 8, 40),
      suggestedCategories: sanitizeStringArray(parsed?.suggestedCategories, 6, 80),
      suggestedCategoryIds: classifiedCategoryIds.length > 0
        ? classifiedCategoryIds
        : sanitizeIdArray(parsed?.suggestedCategoryIds, 6),
      sku: sanitizeString(parsed?.sku, 60),
      stockQuantity: Number.isFinite(Number(parsed?.stockQuantity))
        ? Math.max(0, Math.min(200, Math.round(Number(parsed.stockQuantity))))
        : 100,
      fastDelivery: Boolean(parsed?.fastDelivery),
      allowReturn: typeof parsed?.allowReturn === "boolean" ? parsed.allowReturn : true,
      allowReplacement: typeof parsed?.allowReplacement === "boolean" ? parsed.allowReplacement : true,
      mobileSpecsEnabled: Boolean(parsed?.mobileSpecsEnabled),
      mobileSpecs,
    };

    return NextResponse.json({
      success: true,
      fields,
      categorySelectionMode: availableCategories.length ? "id-constrained" : "name-fallback",
    });
  } catch (error) {
    console.error("Auto-fill from image error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to auto-fill product details" },
      { status: 500 }
    );
  }
}

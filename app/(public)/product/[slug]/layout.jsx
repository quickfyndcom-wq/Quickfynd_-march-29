import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

const resolveImageUrl = (image) => {
  if (typeof image === "string" && image.trim()) return image;
  if (image && typeof image === "object") {
    const direct = image.url || image.src;
    if (typeof direct === "string" && direct.trim()) return direct;
  }
  return "";
};

export async function generateMetadata({ params }) {
  const slug = params?.slug;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://quickfynd.com";

  if (!slug) {
    return {
      title: "Product | Quickfynd",
      description: "Explore product details and offers on Quickfynd.",
    };
  }

  try {
    await dbConnect();

    let product = await Product.findOne({ slug })
      .select("name slug shortDescription description metaTitle metaDescription seoKeywords images")
      .lean();

    if (!product && /^[a-fA-F0-9]{24}$/.test(slug)) {
      product = await Product.findById(slug)
        .select("name slug shortDescription description metaTitle metaDescription seoKeywords images")
        .lean();
    }

    if (!product) {
      return {
        title: "Product Not Found | Quickfynd",
        description: "The requested product is unavailable.",
      };
    }

    const title = String(product.metaTitle || product.name || "Product | Quickfynd").trim();
    const rawDescription = String(
      product.metaDescription || product.shortDescription || product.description || "Explore this product on Quickfynd."
    )
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const description = rawDescription.slice(0, 160);
    const keywords = Array.isArray(product.seoKeywords)
      ? product.seoKeywords.map((keyword) => String(keyword || '').trim()).filter(Boolean)
      : [];
    const imageUrl = resolveImageUrl(product.images?.[0]);
    const canonicalPath = product.slug ? `/product/${product.slug}` : `/product/${slug}`;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;

    return {
      title,
      description,
      ...(keywords.length ? { keywords } : {}),
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: "website",
        images: imageUrl ? [{ url: imageUrl }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch {
    return {
      title: "Product | Quickfynd",
      description: "Explore product details and offers on Quickfynd.",
    };
  }
}

export default function ProductLayout({ children }) {
  return children;
}

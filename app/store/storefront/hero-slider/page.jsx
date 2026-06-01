"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";

const MAX_SLIDES = 6;
const MAX_IMAGE_SIZE_MB = 5;
const MIN_IMAGE_WIDTH = 1200;
const MIN_IMAGE_HEIGHT = 300;

const emptySlide = (bg = "#7A0A11") => ({
  image: "",
  link: "/offers",
  bg,
});

export default function HeroSliderPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [slides, setSlides] = useState([emptySlide("#7A0A11"), emptySlide("#0071A4"), emptySlide("#00D5C3")]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/store/hero-slider", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (typeof data?.enabled === "boolean") {
          setEnabled(data.enabled);
        }

        if (Array.isArray(data?.slides) && data.slides.length > 0) {
          setSlides(
            data.slides.map((slide) => ({
              image: slide.image || "",
              link: slide.link || "/offers",
              bg: slide.bg || "#7A0A11",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load hero slider settings", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [getToken]);

  const updateSlide = (idx, patch) => {
    setSlides((prev) => prev.map((slide, i) => (i === idx ? { ...slide, ...patch } : slide)));
  };

  const addSlide = () => {
    if (slides.length >= MAX_SLIDES) return;
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const removeSlide = (idx) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  };

  const getImageDimensions = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error("Invalid image file"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const uploadSlideImage = async (idx, file) => {
    if (!file) return;
    setMessage("");

    try {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Please upload a valid image file");
      }

      const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error(`Image too large. Max ${MAX_IMAGE_SIZE_MB}MB allowed`);
      }

      const { width, height } = await getImageDimensions(file);
      if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
        throw new Error(`Image too small. Minimum ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px required`);
      }

      const token = await getToken();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", "banner");

      const { data } = await axios.post("/api/store/upload-image", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (!data?.url) {
        throw new Error("Upload failed");
      }

      updateSlide(idx, { image: data.url });
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || "Failed to upload image");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const sanitizedSlides = slides
        .map((slide) => ({
          image: String(slide.image || "").trim(),
          link: (slide.link || "/offers").trim() || "/offers",
          bg: slide.bg || "#7A0A11",
        }))
        .filter((slide) => slide.image);

      if (sanitizedSlides.length === 0) {
        throw new Error("Upload at least one banner image before saving");
      }

      const token = await getToken();
      await axios.post(
        "/api/store/hero-slider",
        {
          enabled,
          slides: sanitizedSlides,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage("Hero slider settings saved successfully!");
    } catch (err) {
      setMessage(err?.response?.data?.error || "Failed to save settings");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">Loading hero slider settings...</div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Hero Slider</h2>
          <p className="text-sm text-slate-500">Upload homepage hero banners and set slide background colors</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSave} className="max-w-4xl space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Enable Hero Slider</h3>
                <p className="text-sm text-slate-500">Show the hero banner slider on homepage</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              {slides.map((slide, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900">Slide {idx + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      disabled={slides.length <= 1}
                      className="text-sm text-rose-600 disabled:text-slate-400"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Banner Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadSlideImage(idx, e.target.files?.[0])}
                        className="w-full border border-slate-300 p-2 rounded-lg text-sm"
                      />
                      <p className="mt-1 text-xs text-slate-500">Recommended 1250x320, minimum {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}, max {MAX_IMAGE_SIZE_MB}MB</p>
                      {slide.image && (
                        <img
                          src={slide.image}
                          alt={`Slide ${idx + 1}`}
                          className="mt-2 w-full h-20 object-cover rounded border border-slate-200"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Click Link</label>
                      <input
                        type="text"
                        value={slide.link}
                        onChange={(e) => updateSlide(idx, { link: e.target.value })}
                        placeholder="/offers"
                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Background Color</label>
                      <input
                        type="color"
                        value={slide.bg}
                        onChange={(e) => updateSlide(idx, { bg: e.target.value })}
                        className="w-full h-[42px] border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addSlide}
                disabled={slides.length >= MAX_SLIDES}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Add Slide
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Hero Slider"}
            </button>

            {message && (
              <div className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
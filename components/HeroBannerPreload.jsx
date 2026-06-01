/**
 * Preload critical hero banner images for faster LCP
 * Place this in the root layout or page for best performance
 */
export default function HeroBannerPreload() {
  return (
    <>
      {/* Preload first hero image (LCP optimization) */}
      <link
        rel="preload"
        as="image"
        href="/_next/static/media/main2.916873fb.webp"
        imageSrcSet="/_next/static/media/main2.916873fb.webp 1250w"
        imageSizes="(max-width: 1250px) 100vw, 1250px"
        fetchPriority="high"
      />
    </>
  );
}

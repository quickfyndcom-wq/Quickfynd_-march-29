import { Outfit } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import React from "react";
import MetaPixel from "@/components/MetaPixel";
import SocialProofPopup from "@/components/SocialProofPopup";
import ClientLayout from "./ClientLayout";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
  title: "Quickfynd - Shop smarter",
  description:
    "Discover trending gadgets, fashion, home essentials & more at the best price. Fast delivery, secure checkout, and deals you don't want to miss.",
  icons: {
    icon: '/assets/logo/favicon.png',
    shortcut: '/assets/logo/favicon.png',
    apple: '/assets/logo/favicon.png',
  },
};

// Performance optimization - Prevent auto-zoom on mobile
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const ik = process.env.IMAGEKIT_URL_ENDPOINT;
  let ikOrigin = null;
  try {
    if (ik) ikOrigin = new URL(ik).origin;
  } catch {}

  return (
    <html lang="en">
      <head>
        {/* ImageKit Optimization */}
        {ikOrigin && (
          <>
            <link rel="dns-prefetch" href={ikOrigin} />
            <link rel="preconnect" href={ikOrigin} crossOrigin="anonymous" />
          </>
        )}
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JBWQZM4C36"
          strategy="afterInteractive"
        />
        <Script id="ga4-gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-JBWQZM4C36');
          `}
        </Script>
        {/* Google Tag Manager - HEAD */}
        <Script id="gtm-head" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5QLZ2255');
          `}
        </Script>
        {/* Tawk.to Chat Widget - DISABLED */}
        {/* <Script id="tawk-to" strategy="lazyOnload">
          {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/6960fec410a230197fa5d3f5/1jehe6c93';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
            })();
          `}
        </Script> */}
      </head>
      <body className={`${outfit.className} antialiased`} suppressHydrationWarning>
        <React.Suspense fallback={null}>
          <MetaPixel />
        </React.Suspense>
        {/* Google Tag Manager (noscript required for browsers with JS disabled) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5QLZ2255"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* Add Navbar and Footer globally via ClientLayout */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

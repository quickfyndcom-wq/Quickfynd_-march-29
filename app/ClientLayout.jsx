"use client";
import ReduxProvider from "@/lib/ReduxProvider";
import Navbar from "@/components/Navbar";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import Footer from "@/components/Footer";
import SupportBar from "@/components/SupportBar";
import Chatbot from "@/components/Chatbot";
import PageTracker from "@/components/PageTracker";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";

function InitializeApp({ children }) {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product.list);

  useEffect(() => {
    // Load products on app start if we have less than 100 products
    if (products.length < 100) {
      const loadProducts = async () => {
        try {
          // Fetch ALL products with a very high limit
          const { data } = await axios.get("/api/products?limit=200");
          if (data.products && Array.isArray(data.products)) {
            dispatch({ type: "product/setProduct", payload: data.products });
            console.log('[ClientLayout] Loaded', data.products.length, 'products');
          } else if (data && Array.isArray(data)) {
            dispatch({ type: "product/setProduct", payload: data });
            console.log('[ClientLayout] Loaded', data.length, 'products');
          }
        } catch (error) {
          const serverDetails = error?.response?.data;
          if (serverDetails) {
            console.error('[ClientLayout] Failed to load products:', serverDetails);
          } else {
            console.error('[ClientLayout] Failed to load products:', error);
          }
        }
      };
      loadProducts();
    }
  }, [products.length, dispatch]);

  return children;
}

export default function ClientLayout({ children }) {
  return (
    <ReduxProvider>
      <AppInstallPrompt />
      <Navbar />
      <PageTracker />
      <Toaster />
      <InitializeApp>{children}</InitializeApp>
      <SupportBar />
      <Chatbot />
      <Footer />
    </ReduxProvider>
  );
}

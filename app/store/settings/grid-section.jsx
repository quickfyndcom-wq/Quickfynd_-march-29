"use client";
import AdminGridSectionEditor from "@/components/AdminGridSectionEditor";

export default function StoreGridSectionPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Homepage Grid Section</h1>
      <p className="mb-4 text-gray-600">Set the title and pick up to 3 products to feature in your homepage grid section. These will show with their exact discount/label as seen by customers.</p>
      <AdminGridSectionEditor />
    </div>
  );
}

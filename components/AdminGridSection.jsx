import React from "react";
import Image from "next/image";

// products: [{ image, name, label, labelType }]
export default function AdminGridSection({ title, products = [] }) {
  return (
    <section className="bg-[#f7f7f9] rounded-xl p-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {products.map((product, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-2 flex flex-col h-full">
            <div className="w-full aspect-square flex items-center justify-center mb-2">
              <Image
                src={product.image}
                alt={product.name}
                width={120}
                height={120}
                unoptimized
                className="object-contain rounded"
                priority={idx < 3}
              />
            </div>
            <div className="text-xs font-medium text-gray-800 truncate mb-1">{product.name}</div>
            {product.label && (
              <div className={`text-xs font-semibold rounded px-1.5 py-0.5 mt-auto ${
                product.labelType === "offer"
                  ? "text-green-600 bg-green-50"
                  : product.labelType === "special"
                  ? "text-blue-600 bg-blue-50"
                  : product.labelType === "explore"
                  ? "text-orange-600 bg-orange-50"
                  : "text-gray-600 bg-gray-100"
              }`}>
                {product.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

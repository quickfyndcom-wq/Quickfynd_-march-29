'use client'

export default function ReturnPolicyPage() {
  return (
    <div className="bg-gray-50 max-w-[1450px] mx-auto">
      <div className="max-w-3xl mx-auto px-4 py-10 min-h-[60vh]">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Return & Replacement Policy</h1>
        <p className="text-gray-600 mb-8">We want you to be happy with your purchase. This policy explains when and how you can request a return or a replacement on QuickFynd.com.</p>

        <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Eligibility</h2>
            <p className="text-gray-700">- Returns are accepted within 7 days of delivery for eligible products.<br/>- Replacements are available within 15 days of delivery where supported.<br/>- Items must be in original condition with all tags, accessories, and packaging.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Non-Returnable Items</h2>
            <p className="text-gray-700">Certain categories (e.g., perishable goods, hygiene/innerwear, made-to-order items) may not be eligible. Product pages will indicate eligibility.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. How to Request</h2>
            <p className="text-gray-700">Go to My Orders and select the relevant order. Choose Return/Replacement, provide the reason, and upload images/videos if requested. Youll receive updates by email.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Inspection & Resolution</h2>
            <p className="text-gray-700">Once the product is picked up/returned, well inspect it. If approved, refunds are processed to the original payment method; replacements are shipped as soon as possible.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Wrong/Damaged Items</h2>
            <p className="text-gray-700">If the item is damaged or incorrect, report it within 48 hours of delivery for priority support.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Contact</h2>
            <p className="text-gray-700">Need help? Email <a href="mailto:support@QuickFynd.com" className="text-orange-600 underline">support@QuickFynd.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

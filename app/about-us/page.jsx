export default function AboutPage() {
  const faqs = [
    {
      q: "What is QuickFynd?",
      a: "QuickFynd is a curated online shopping brand offering useful, everyday products at honest prices across India.",
    },
    {
      q: "Do you provide GST invoice details?",
      a: "Yes. QuickFynd operates under the trade name NILAAS. GSTIN: 32JWYPS4831L1Z1. These details appear on invoices; contact us if you need GST billing support.",
    },
    {
      q: "Do you offer Cash on Delivery (COD)?",
      a: "Yes, COD is available on many serviceable pincodes. You’ll see the option at checkout when available.",
    },
    {
      q: "How long does delivery take?",
      a: "Most orders reach customers within 3–7 working days, depending on the pincode and courier partner.",
    },
    {
      q: "Are the products quality checked?",
      a: "Yes. Each product goes through a basic quality check before packing and dispatch.",
    },
    {
      q: "Do you deliver everywhere in India?",
      a: "We deliver to most serviceable pincodes across India. You can check your pincode on the product page.",
    },
  ];

  return (
    <div className="w-full max-w-[1450px] mx-auto px-4 lg:px-6 py-10 lg:py-14 space-y-10 lg:space-y-14">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50 via-white to-emerald-50 border border-gray-100">
        <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:p-10 lg:grid-cols-[1.7fr,1.3fr] items-center">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-medium text-sky-700 border border-sky-100 shadow-sm">
              QuickFynd — Powered by Nilaas
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </p>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Simple, trustworthy shopping
              <span className="block text-sky-700">made for everyday India.</span>
            </h1>

            <p className="text-gray-600 text-sm sm:text-base max-w-xl">
              QuickFynd brings handpicked, useful products at clear prices — no confusing offers,
              no fake discounts. Just straightforward shopping with fast delivery and support that listens.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="text-xs sm:text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-700">
                ✅ COD Available on Many Pincodes
              </span>
              <span className="text-xs sm:text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-700">
                🚚 3–7 Day Delivery (Location Based)
              </span>
              <span className="text-xs sm:text-sm bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-700">
                🛡️ Basic Quality Check Before Dispatch
              </span>
            </div>
          </div>

          {/* Side Card */}
          <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Business Details
            </div>
            <div className="mt-3 space-y-2 text-sm text-gray-800">
              <p className="font-semibold text-gray-900">Trade Name: NILAAS</p>
              <p>
                Brand: QuickFynd (operated under NILAAS)
              </p>
              <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 w-fit">
                GSTIN: 32JWYPS4831L1Z1
              </p>
              <p className="text-xs text-gray-600">
                Use this GST and trade name for invoices and tax purposes. For GST invoice help, please contact support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE ARE & WHY SHOP WITH US */}
      <section className="grid gap-8 lg:grid-cols-[1.4fr,1.6fr]">
        {/* Who We Are */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-7 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 border border-gray-200">
            <span className="text-xs">📍</span> Built for Indian customers
          </div>

          <h2 className="text-xl font-semibold text-gray-900">Who We Are</h2>
          <p className="text-sm sm:text-base text-gray-700">
            QuickFynd is an online shopping platform focused on useful, quality-driven products
            that actually solve everyday needs. From lifestyle essentials to smart tools, we pick
            products that offer value — not just hype.
          </p>
          <p className="text-sm sm:text-base text-gray-700">
            Guided and supported by <span className="font-semibold">NILAAS</span>, we work towards
            better product curation, service, and customer experience on every order. QuickFynd operates
            under the trade name NILAAS (GSTIN: 32JWYPS4831L1Z1).
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-white border border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Our focus</p>
              <p className="text-sm text-gray-800">Honest pricing, clear information, and simple buying.</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Our promise</p>
              <p className="text-sm text-gray-800">We listen, improve and stay transparent with customers.</p>
            </div>
          </div>
        </div>

        {/* Why Shop With Us */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Why shop with QuickFynd?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">💰</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Clear & affordable pricing</p>
                <p className="text-xs text-gray-600">
                  No fake MRP games or confusing discounts. Just simple, visible pricing.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">⚡</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Fast & tracked delivery</p>
                <p className="text-xs text-gray-600">
                  Partnered couriers with tracking updates till your doorstep.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">🧪</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Basic quality checks</p>
                <p className="text-xs text-gray-600">
                  Products are inspected before dispatch to avoid avoidable issues.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-lg">🧑‍💻</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer-first support</p>
                <p className="text-xs text-gray-600">
                  Simple communication, clear updates and genuine attempt to resolve problems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS + CULTURE */}
      <section className="grid gap-8 lg:grid-cols-[1.5fr,1.5fr]">
        {/* How It Works */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-7">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How QuickFynd works</h2>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-semibold">
                1
              </span>
              <div>
                <p className="font-semibold text-gray-900">We curate products</p>
                <p className="text-gray-600 text-xs">
                  Items are selected based on usefulness, demand, and reliability — not just trends.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-semibold">
                2
              </span>
              <div>
                <p className="font-semibold text-gray-900">You order with clarity</p>
                <p className="text-gray-600 text-xs">
                  Transparent pricing, COD availability (where possible), and clear product details.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-semibold">
                3
              </span>
              <div>
                <p className="font-semibold text-gray-900">We process & deliver</p>
                <p className="text-gray-600 text-xs">
                  Quality check, packing, handover to courier, and tracking updates till delivery.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Culture & Ethics */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-gray-900">Our Culture & Values</h2>
            <p className="text-sm sm:text-base text-gray-700 mt-3">
              We believe in honesty, teamwork, and continuous improvement. Every order is a chance to
              earn trust — not just complete a transaction.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-700">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-lg">🤝</span>
                <span>Honest communication</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-lg">📦</span>
                <span>Careful packing & dispatch</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-lg">📊</span>
                <span>We improve from feedback</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-lg">🌱</span>
                <span>Long-term brand building</span>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-gray-600 mt-4 text-center">
              “Together, we grow — with our customers, partners, and team.”
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-4 sm:p-5 text-center text-gray-100">
            <p className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-1">
              Ethics & Trust
            </p>
            <p className="text-sm sm:text-base font-medium">
              We follow fair practices, transparent communication, and aim to build long-term relationships,
              not one-time orders.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sm:p-7">
        <div className="text-center mb-5">
          <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
          <p className="text-xs text-gray-500 mt-1">
            Some quick answers. For anything else, you can always contact us.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {faqs.map((item, index) => (
            <details
              key={index}
              className="group rounded-xl border border-gray-200 bg-white px-4 py-3 cursor-pointer transition hover:border-sky-300"
            >
              <summary className="flex items-center justify-between gap-3 list-none">
                <span className="text-sm font-medium text-gray-900">
                  {item.q}
                </span>
                <span className="text-xs text-gray-500 group-open:hidden">+</span>
                <span className="text-xs text-gray-500 hidden group-open:inline">−</span>
              </summary>
              <p className="text-xs sm:text-sm text-gray-700 mt-2">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

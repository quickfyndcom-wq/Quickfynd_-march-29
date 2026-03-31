'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItem, setExpandedItem] = useState(null)

  const helpCategories = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀', subtitle: 'Account setup and basics' },
    { id: 'shopping', title: 'Shopping', icon: '🛍️', subtitle: 'Finding and saving products' },
    { id: 'orders', title: 'Orders & Delivery', icon: '📦', subtitle: 'Tracking and shipping updates' },
    { id: 'payments', title: 'Payments', icon: '💳', subtitle: 'Methods and payment issues' },
    { id: 'returns', title: 'Returns & Refunds', icon: '↩️', subtitle: 'Return flow and refund timeline' },
    { id: 'account', title: 'Account', icon: '👤', subtitle: 'Profile, address, and security' },
  ]

  const helpContent = {
    'getting-started': [
      {
        question: 'How do I create an account?',
        answer: 'Click on "Sign Up" at the top right, enter your email and create a password. You can also sign up using your Google account for faster registration.'
      },
      {
        question: 'How do I reset my password?',
        answer: 'Go to the login page and click "Forgot Password?". Enter your email, and we\'ll send you a link to reset your password within minutes.'
      },
      {
        question: 'Can I use QuickFynd without an account?',
        answer: 'You can browse products without an account, but you need to create one to make a purchase or track orders.'
      }
    ],
    'shopping': [
      {
        question: 'How do I search for products?',
        answer: 'Use the search bar at the top, enter keywords, or browse by categories. You can also filter by price, ratings, and delivery speed.'
      },
      {
        question: 'How do I add items to my wishlist?',
        answer: 'Click the heart icon on any product page. You can manage your wishlist from your account dashboard anytime.'
      },
      {
        question: 'Can I save items for later?',
        answer: 'Yes! Add items to your wishlist or cart. Your cart items are saved for 30 days if you don\'t check out.'
      },
      {
        question: 'How do I apply a coupon code?',
        answer: 'During checkout, click "Apply Coupon" and enter your code. The discount will be applied instantly if the code is valid.'
      }
    ],
    'orders': [
      {
        question: 'How can I track my order?',
        answer: 'Go to "My Orders" in your account or click the "Track" button on the order confirmation email. You\'ll see real-time updates.'
      },
      {
        question: 'What are the delivery timeframes?',
        answer: 'Standard delivery: 3-5 business days. Fast delivery: 1-2 business days. Delivery times are estimated at checkout.'
      },
      {
        question: 'Can I change my delivery address?',
        answer: 'You can change your address within 1 hour of placing the order. After that, contact our support team.'
      },
      {
        question: 'Do you deliver on weekends?',
        answer: 'Yes! We deliver 7 days a week. Weekend deliveries may take an extra day depending on your location.'
      }
    ],
    'payments': [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept credit/debit cards, UPI, net banking, digital wallets, and cash on delivery (where available).'
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely! We use industry-standard SSL encryption and PCI-DSS compliance to protect your data.'
      },
      {
        question: 'Why was my payment declined?',
        answer: 'This could be due to insufficient funds, incorrect details, or bank restrictions. Try another payment method or contact your bank.'
      },
      {
        question: 'Can I pay using cryptocurrencies?',
        answer: 'Currently, we don\'t accept cryptocurrencies, but we\'re exploring this option for future updates.'
      }
    ],
    'returns': [
      {
        question: 'What is your return policy?',
        answer: 'You can return most items within 30 days of delivery for a full refund or exchange.'
      },
      {
        question: 'How do I initiate a return?',
        answer: 'Go to "My Orders", find the item, and click "Return". Follow the steps and arrange a pickup.'
      },
      {
        question: 'When will I get my refund?',
        answer: 'Refunds are processed within 5-7 business days after we receive and inspect the returned item.'
      },
      {
        question: 'Can I return items without opening them?',
        answer: 'Yes, unopened items in original packaging are eligible for return. Some items have restrictions; check our return policy.'
      }
    ],
    'account': [
      {
        question: 'How do I update my profile information?',
        answer: 'Go to "My Profile", click "Edit", make your changes, and save. Updates take effect immediately.'
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes, you can request account deletion from Settings. Your data will be deleted within 30 days.'
      },
      {
        question: 'How do I view my address book?',
        answer: 'Go to "My Profile" > "Addresses" to view, add, edit, or delete saved addresses.'
      },
      {
        question: 'How can I become a seller?',
        answer: 'Click "Create Your Store" to start the seller registration. You\'ll need business documents and bank details.'
      }
    ]
  }

  const currentCategory = helpContent[activeCategory] || []
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredCategoryArticles = useMemo(() => {
    if (!normalizedQuery) return currentCategory

    return currentCategory.filter((item) => {
      const question = item.question.toLowerCase()
      const answer = item.answer.toLowerCase()
      return question.includes(normalizedQuery) || answer.includes(normalizedQuery)
    })
  }, [currentCategory, normalizedQuery])

  const totalArticles = Object.values(helpContent).reduce((sum, list) => sum + list.length, 0)

  const matchingArticlesCount = useMemo(() => {
    if (!normalizedQuery) return currentCategory.length

    return Object.values(helpContent)
      .flat()
      .filter((item) => {
        const question = item.question.toLowerCase()
        const answer = item.answer.toLowerCase()
        return question.includes(normalizedQuery) || answer.includes(normalizedQuery)
      }).length
  }, [helpContent, normalizedQuery, currentCategory.length])

  const activeCategoryMeta = helpCategories.find((category) => category.id === activeCategory)

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId)
    setExpandedItem(null)
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">24/7 Help Center</span>
            <span className="px-3 py-1 rounded-full bg-white/15 text-sm font-medium">{totalArticles} Articles</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Help Center</h1>
          <p className="text-blue-100 text-base md:text-lg max-w-3xl">
            Find quick answers, troubleshoot issues, and connect with support when you need personal help.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="relative max-w-3xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setExpandedItem(null)
              }}
              placeholder="Search help articles..."
              className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Popular:</span>
            {['reset password', 'track order', 'returns', 'coupon code'].map((chip) => (
              <button
                key={chip}
                onClick={() => setSearchQuery(chip)}
                className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
              <h3 className="font-bold text-slate-800 mb-4">Categories</h3>
              <div className="space-y-2">
                {helpCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition border ${
                      activeCategory === cat.id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{cat.icon} {cat.title}</span>
                      <span className="text-xs text-slate-500">{(helpContent[cat.id] || []).length}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{cat.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
                  {activeCategoryMeta?.icon} {activeCategoryMeta?.title}
                </h2>
                <p className="text-slate-600 mt-1">{activeCategoryMeta?.subtitle}</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm">
                {matchingArticlesCount} result{matchingArticlesCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="space-y-4">
              {filteredCategoryArticles.map((item, idx) => {
                const itemKey = `${activeCategory}-${idx}`

                return (
                <div
                  key={itemKey}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedItem(expandedItem === itemKey ? null : itemKey)}
                    className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-50 transition"
                  >
                    <h3 className="font-semibold text-slate-800 text-base md:text-lg pr-4">{item.question}</h3>
                    <span
                      className={`text-slate-500 transition-transform ${
                        expandedItem === itemKey ? 'rotate-180' : ''
                      }`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  {expandedItem === itemKey && (
                    <div className="px-6 pb-4 pt-2 border-t border-slate-200 text-slate-700 bg-slate-50 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              )})}

              {filteredCategoryArticles.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No matching articles found</h3>
                  <p className="text-slate-600 mb-4">Try another keyword or switch to a different category.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-8">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold text-slate-800">Still Need Help?</h3>
            <p className="text-slate-600 mt-2">Choose your preferred support channel and we’ll assist you quickly.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/70 rounded-xl border border-blue-100 p-5">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-bold text-slate-800 mb-2">Email Support</h3>
              <p className="text-slate-600 mb-4">Get help within 24 hours</p>
              <a href="mailto:support@QuickFynd.com" className="text-blue-600 hover:underline font-medium">
                support@QuickFynd.com
              </a>
            </div>
            <div className="bg-white/70 rounded-xl border border-blue-100 p-5">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-bold text-slate-800 mb-2">Live Chat</h3>
              <p className="text-slate-600 mb-4">Chat with us in real-time</p>
              <a href="/support" className="text-blue-600 hover:underline font-medium">
                Start Chat
              </a>
            </div>
            <div className="bg-white/70 rounded-xl border border-blue-100 p-5">
              <div className="text-3xl mb-3">☎️</div>
              <h3 className="font-bold text-slate-800 mb-2">Call Us</h3>
              <p className="text-slate-600 mb-4">Monday-Friday, 9am-6pm</p>
              <p className="text-blue-600 font-medium">+1-800-QUICK-FYND</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Can't find what you're looking for?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/faq" className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition font-medium">
              FAQ
            </Link>
            <Link href="/support" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

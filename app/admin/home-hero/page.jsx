
'use client'
import SectionEditor from "@/components/SectionEditor";



import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductSelect from '@/components/ProductSelect'


// Special editor for the Main Hero section (select products, not images)
function MainHeroEditor({ label, sectionKey, maxSlides = 3 }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectionId, setSelectionId] = useState(null)
  const [form, setForm] = useState({
    section: sectionKey,
    title: label,
    subtitle: '',
    bannerCtaText: 'Shop Now',
    bannerCtaLink: '/shop',
    isActive: true,
    sortOrder: 0,
    slides: [], // array of product IDs
  })

  // Load existing selection
  useEffect(() => { (async () => {
    try {
      const res = await fetch(`/api/home-selection?section=${encodeURIComponent(sectionKey)}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const sel = data?.selection
      if (sel) {
        setSelectionId(sel._id)
        setForm(f => ({
          ...f,
          title: sel.title || f.title,
          subtitle: sel.subtitle || '',
          bannerCtaText: sel.bannerCtaText || f.bannerCtaText,
          bannerCtaLink: sel.bannerCtaLink || f.bannerCtaLink,
          isActive: typeof sel.isActive === 'boolean' ? sel.isActive : true,
          sortOrder: sel.sortOrder ?? 0,
          slides: Array.isArray(sel.slides) ? sel.slides : [],
        }))
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  })() }, [sectionKey])

  // Add a product to slides (unique only)
  const addProduct = (productId) => {
    if (!productId || form.slides.includes(productId)) return;
    setForm(f => ({ ...f, slides: [...f.slides, productId].slice(0, maxSlides) }))
  }
  // Remove a product from slides
  const removeProduct = (i) => setForm(f => ({ ...f, slides: f.slides.filter((_, x) => x !== i) }))

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, slides: (form.slides || []).slice(0, maxSlides) }
      if (selectionId) {
        await axios.put(`/api/admin/home-sections/${selectionId}`, payload)
      } else {
        const { data } = await axios.post('/api/admin/home-sections', payload)
        setSelectionId(data?.section?._id)
      }
      toast.success(`${label} saved`)
    } catch (e) { toast.error(e?.response?.data?.error || 'Save failed') } finally { setSaving(false) }
  }

  if (loading) return (
    <div className='border rounded-xl p-6'>Loading {label}…</div>
  )

  return (
    <form onSubmit={save} className='bg-white border rounded-xl shadow p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{label}</h2>
        <div className='text-xs text-gray-500'>Section key: {sectionKey}</div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='block text-sm text-gray-600'>Title</label>
          <input className='w-full border rounded-lg px-3 py-2' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className='block text-sm text-gray-600'>Subtitle</label>
          <input className='w-full border rounded-lg px-3 py-2' value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <label className='block text-sm text-gray-600'>CTA Text</label>
          <input className='w-full border rounded-lg px-3 py-2' value={form.bannerCtaText} onChange={e => setForm({ ...form, bannerCtaText: e.target.value })} />
        </div>
        <div>
          <label className='block text-sm text-gray-600'>CTA Link</label>
          <input className='w-full border rounded-lg px-3 py-2' value={form.bannerCtaLink} onChange={e => setForm({ ...form, bannerCtaLink: e.target.value })} placeholder='/shop' />
        </div>
        <label className='flex items-center gap-2'><input type='checkbox' checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center gap-3'>
          <ProductSelect value={''} onChange={addProduct} />
          <span className='text-xs text-gray-500'>Add product (max {maxSlides})</span>
        </div>
        {form.slides.length === 0 && (
          <p className='text-sm text-gray-500'>No products yet. Select a product to add.</p>
        )}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {form.slides.map((product, i) => (
            <div key={product?._id || i} className='border rounded-lg p-4 space-y-2 flex flex-col items-center'>
              {product?.image && (
                <img src={product.image} alt={product.title || 'Product'} className='w-24 h-16 object-cover rounded mb-2' />
              )}
              <span className='font-medium text-gray-700'>{product?.title || 'Untitled Product'}</span>
              {product?.subtitle && <span className='text-xs text-gray-500'>{product.subtitle}</span>}
              <button type='button' className='text-red-600 text-sm' onClick={() => removeProduct(i)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className='flex items-center gap-3 justify-end'>
        <button disabled={saving} className='px-4 py-2 bg-black text-white rounded-lg'>{saving ? 'Saving…' : `Save ${label}`}</button>
      </div>
    </form>
  )
}

export default function AdminHomeHeroPage() {
  const [customSections, setCustomSections] = useState([]);
  const addCustomSection = () => {
    const key = `custom_home_section_${Date.now()}`;
    setCustomSections([...customSections, { key, label: '', maxSlides: 6 }]);
  };

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Admin · Home Hero</h1>
        <Link href='/admin/home-sections' className='text-sm text-blue-600'>Home Sections</Link>
      </div>

      {/* Section 1: Main banner with 3 product slides */}
      <MainHeroEditor label='Section 1 · Main Hero' sectionKey='home_hero' maxSlides={3} />

      {/* Section 2: Right Card Top */}
      <SectionEditor label='Section 2 · Right Card (Top)' sectionKey='home_hero_right_1' maxSlides={3} />

      {/* Section 3: Right Card Bottom */}
      <SectionEditor label='Section 3 · Right Card (Bottom)' sectionKey='home_hero_right_2' maxSlides={3} />

      {/* Custom Home Sections */}
      {customSections.map((section, idx) => (
        <SectionEditor
          key={section.key}
          label={section.label || `Custom Section ${idx + 1}`}
          sectionKey={section.key}
          maxSlides={section.maxSlides}
        />
      ))}
      <div className='flex justify-end'>
        <button
          type='button'
          className='px-4 py-2 bg-blue-600 text-white rounded-lg mt-4'
          onClick={addCustomSection}
        >
          + Add New Home Section
        </button>
      </div>
    </div>
  )
}

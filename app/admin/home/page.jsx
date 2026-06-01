'use client'
import { useEffect, useMemo, useState } from 'react'
// import your current auth hook here
import axios from 'axios'
import Loading from '@/components/Loading'
import { toast } from 'react-hot-toast'


const SECTION_OPTIONS = [
  { value: 'limited_offers', label: 'Limited Time Offers (BestSelling block)' },
  { value: 'home_deals', label: 'Home Deals Section' },
  { value: 'hero_deals', label: 'Hero Deals Strip' },
]

export default function AdminHomeSelectionPage() {
  // TODO: Replace with your current auth logic
  const getToken = async () => '' // Replace with real getToken
  const user = null // Replace with real user object

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [section, setSection] = useState('limited_offers')
  const [mode, setMode] = useState('category') // 'category' | 'tag'
  const [category, setCategory] = useState('')
  const [tag, setTag] = useState('')
  const [selected, setSelected] = useState([]) // array of product ids

  // Fetch all public products to choose from
  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/products')
      setProducts(data.products || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const categories = useMemo(() => {
    const set = new Set()
    products.forEach(p => p.category && set.add(p.category))
    return Array.from(set)
  }, [products])

  const filtered = useMemo(() => {
    let list = products
    if (mode === 'category' && category) list = list.filter(p => p.category === category)
    // For tag mode, you could filter if your products have tags in attributes
    return list
  }, [products, mode, category])

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const move = (id, dir) => {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const swapWith = dir === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]]
      return copy
    })
  }

  const saveSelection = async () => {
    try {
      const token = await getToken()
      await axios.put('/api/admin/home-selection', {
        section,
        category: mode === 'category' ? category : null,
        tag: mode === 'tag' ? tag : null,
        productIds: selected,
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Selection saved')
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message)
    }
  }

  if (loading) return <Loading />

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl text-slate-700'>Home Page Selection</h1>

      <div className='flex flex-wrap gap-4 items-end'>
        <div>
          <label className='block text-sm font-medium mb-1'>Section</label>
          <select value={section} onChange={e => setSection(e.target.value)} className='border rounded px-3 py-2'>
            {SECTION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium mb-1'>Mode</label>
          <div className='flex gap-3'>
            <label className='inline-flex items-center gap-2'>
              <input type='radio' checked={mode==='category'} onChange={() => setMode('category')} />
              <span>Category</span>
            </label>
            <label className='inline-flex items-center gap-2'>
              <input type='radio' checked={mode==='tag'} onChange={() => setMode('tag')} />
              <span>Tag</span>
            </label>
          </div>
        </div>

        {mode === 'category' ? (
          <div>
            <label className='block text-sm font-medium mb-1'>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className='border rounded px-3 py-2'>
              <option value=''>All</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className='block text-sm font-medium mb-1'>Tag</label>
            <input value={tag} onChange={e => setTag(e.target.value)} placeholder='e.g. summer, promo' className='border rounded px-3 py-2' />
          </div>
        )}

        <button onClick={saveSelection} className='bg-slate-800 text-white px-4 py-2 rounded'>Save</button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Available */}
        <div>
          <h2 className='font-medium mb-2 text-slate-700'>Available Products ({filtered.length})</h2>
          <div className='border rounded max-h-[420px] overflow-auto divide-y'>
            {filtered.map(p => (
              <div key={p._id} className='flex items-center justify-between p-2'>
                <div className='truncate'>
                  <p className='font-medium text-sm truncate'>{p.name}</p>
                  <p className='text-xs text-slate-500 truncate'>{p.category}</p>
                </div>
                <button onClick={() => toggleSelect(p._id)} className='text-sm px-2 py-1 rounded border'>
                  {selected.includes(p._id) ? 'Remove' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected */}
        <div>
          <h2 className='font-medium mb-2 text-slate-700'>Selected ({selected.length})</h2>
          <div className='border rounded max-h-[420px] overflow-auto divide-y'>
            {selected.map(id => {
              const p = products.find(x => x._id === id)
              if (!p) return null
              return (
                <div key={id} className='flex items-center justify-between p-2'>
                  <div className='truncate'>
                    <p className='font-medium text-sm truncate'>{p.name}</p>
                    <p className='text-xs text-slate-500 truncate'>{p.category}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => move(id,'up')} className='text-xs px-2 py-1 rounded border'>Up</button>
                    <button onClick={() => move(id,'down')} className='text-xs px-2 py-1 rounded border'>Down</button>
                    <button onClick={() => toggleSelect(id)} className='text-xs px-2 py-1 rounded border'>Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

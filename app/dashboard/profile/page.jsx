'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, updateProfile } from 'firebase/auth'
import axios from 'axios'
import Loading from '@/components/Loading'
import Link from 'next/link'
import toast from 'react-hot-toast'
import AddressModal from '@/components/AddressModal'
import DashboardSidebar from '@/components/DashboardSidebar'

export default function DashboardProfilePage() {
  const [user, setUser] = useState(undefined)
  const [dbPhone, setDbPhone] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [addrToEdit, setAddrToEdit] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      try {
        const token = await auth.currentUser.getIdToken(true)
        const { data } = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setDbPhone(data?.profile?.phone || '')
      } catch {
        setDbPhone('')
      }
    }
    loadProfile()
  }, [user])

  // load saved addresses for the user
  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return
      try {
        setAddrLoading(true)
        const token = await auth.currentUser.getIdToken(true)
        // Fetch addresses from the correct endpoint
        const { data } = await axios.get('/api/address', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const list = Array.isArray(data?.addresses) ? data.addresses : (Array.isArray(data) ? data : [])
        setAddresses(list)
      } catch (err) {
        console.error('[PROFILE] addresses error:', err?.response?.data || err.message)
      } finally {
        setAddrLoading(false)
      }
    }
    loadAddresses()
  }, [user])

  if (user === undefined) return <Loading />

  if (user === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Dashboard / Profile</h1>
        <p className="text-slate-600 mb-6">You need to sign in to view your profile.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
        <DashboardSidebar />

        <main className="md:col-span-3">
          {activeTab === 'profile' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-800 mb-6">Your Profile</h1>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-center gap-6">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt="Profile photo" width={80} height={80} className="rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                    {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-slate-900 text-lg font-medium">{user.displayName || 'No name set'}</p>
                    <button onClick={() => setIsEditing((v) => !v)} className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg">
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-600">
                      <span className="font-medium text-slate-700">Email: </span>{user.email || '—'}
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium text-slate-700">Phone: </span>{dbPhone || user.phoneNumber || '—'}
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium text-slate-700">Account Created: </span>{new Date(user.metadata?.creationTime || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 items-start">
                {/* Edit-only section */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">Edit Profile</h2>
                  <p className="text-slate-600 mb-2 text-xs">Only editable fields appear below.</p>
                  <p className="text-slate-600 mb-3 text-xs">Click "Edit" above to modify your name or photo.</p>
                  {isEditing && (
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const formData = new FormData(e.currentTarget)
                        const displayName = formData.get('displayName')?.toString() || ''
                        const phone = formData.get('phone')?.toString().trim() || ''
                        const photoURL = formData.get('photoURL')?.toString() || user.photoURL || ''
                        try {
                          await updateProfile(auth.currentUser, { displayName, photoURL })
                          const token = await auth.currentUser.getIdToken(true)
                          await axios.patch('/api/profile', {
                            name: displayName,
                            phone,
                            image: photoURL,
                            email: user.email || '',
                          }, {
                            headers: { Authorization: `Bearer ${token}` },
                          })
                          toast.success('Profile updated')
                          setUser({ ...user, displayName, photoURL })
                          setDbPhone(phone)
                          setIsEditing(false)
                        } catch (err) {
                          toast.error(err?.message || 'Failed to update profile')
                        }
                      }}
                    >
                      <label className="text-xs text-slate-700 font-medium">Display Name</label>
                      <input
                        name="displayName"
                        defaultValue={user.displayName || ''}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Your name"
                      />
                      <label className="text-xs text-slate-700 font-medium mt-1">Phone</label>
                      <input
                        name="phone"
                        defaultValue={dbPhone || user.phoneNumber || ''}
                        maxLength={15}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Enter phone number"
                      />
                      <label className="text-xs text-slate-700 font-medium mt-1">Profile Photo</label>
                      <div className="flex items-center gap-3">
                        {user.photoURL && (
                          <Image src={user.photoURL} alt="Current photo" width={50} height={50} className="rounded-full object-cover" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Image must be less than 5MB')
                              return
                            }
                            
                            setUploading(true)
                            try {
                              const token = await auth.currentUser.getIdToken()
                              const formData = new FormData()
                              formData.append('file', file)
                              formData.append('folder', 'profile-photos')
                              
                              const { data } = await axios.post('/api/imagekit-auth/upload', formData, {
                                headers: { 
                                  Authorization: `Bearer ${token}`,
                                  'Content-Type': 'multipart/form-data'
                                }
                              })
                              
                              if (data.url) {
                                await updateProfile(auth.currentUser, { photoURL: data.url })
                                const latestPhone = (document.querySelector('input[name="phone"]')?.value || dbPhone || '').trim()
                                const token2 = await auth.currentUser.getIdToken(true)
                                await axios.patch('/api/profile', {
                                  name: user.displayName || '',
                                  phone: latestPhone,
                                  image: data.url,
                                  email: user.email || '',
                                }, {
                                  headers: { Authorization: `Bearer ${token2}` },
                                })
                                setUser({ ...user, photoURL: data.url })
                                toast.success('Photo uploaded successfully')
                              }
                            } catch (err) {
                              toast.error(err?.response?.data?.error || 'Failed to upload photo')
                            } finally {
                              setUploading(false)
                            }
                          }}
                          disabled={uploading}
                          className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer disabled:opacity-50"
                        />
                      </div>
                      {uploading && <p className="text-xs text-blue-600">Uploading...</p>}
                      {user.photoURL && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateProfile(auth.currentUser, { photoURL: '' })
                              const token = await auth.currentUser.getIdToken(true)
                              await axios.patch('/api/profile', {
                                name: user.displayName || '',
                                phone: dbPhone || '',
                                image: '',
                                email: user.email || '',
                              }, {
                                headers: { Authorization: `Bearer ${token}` },
                              })
                              setUser({ ...user, photoURL: '' })
                              toast.success('Profile photo removed')
                            } catch (err) {
                              toast.error(err?.response?.data?.error || 'Failed to remove photo')
                            }
                          }}
                          className="w-fit text-xs px-3 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          Remove Photo
                        </button>
                      )}
                      <input type="hidden" name="photoURL" value={user.photoURL || ''} />
                      <div className="flex gap-2 mt-2">
                        <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                        <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Saved addresses */}
                <div id="addresses" className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-800">Saved Addresses</h2>
                    <button onClick={() => { setAddrToEdit(null); setShowAddrModal(true) }} className="text-xs text-blue-600 hover:underline font-medium">Add New</button>
                  </div>
                  {addrLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-7 h-7 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                      <p className="text-slate-500 text-center text-sm">No saved addresses yet.<br/><span className="text-xs">Click "Add New" to create one.</span></p>
                    </div>
                  ) : (
                    <ul className="space-y-2 overflow-y-auto max-h-96">
                      {addresses.map((a) => (
                        <li key={a.id || a._id} className="border border-slate-200 rounded-lg p-3 text-xs text-slate-700 hover:border-slate-300 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 mb-0.5">{a.name || a.fullName || 'Address'}</div>
                              <div className="text-slate-600 text-xs">{[a.street, a.city, a.state, a.zip]?.filter(Boolean).join(', ')}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{a.country || 'India'}</div>
                              {a.phone && <div className="text-slate-500 text-xs mt-0.5">Phone: {a.phone}</div>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-1">
                              <button
                                className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                                onClick={() => { setAddrToEdit(a); setShowAddrModal(true) }}
                              >Edit</button>
                              <button
                                className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                                onClick={async () => {
                                  if (!confirm('Delete this address?')) return
                                  try {
                                    const token = await auth.currentUser.getIdToken(true)
                                    await axios.delete(`/api/address?id=${a.id || a._id}`, { headers: { Authorization: `Bearer ${token}` } })
                                    toast.success('Address deleted')
                                    setAddresses(addresses.filter((x) => (x.id || x._id) !== (a.id || a._id)))
                                  } catch (err) {
                                    toast.error(err?.response?.data?.error || 'Delete failed')
                                  }
                                }}
                              >Delete</button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <AddressModal
                  open={showAddrModal}
                  setShowAddressModal={setShowAddrModal}
                  isEdit={!!addrToEdit}
                  initialAddress={addrToEdit}
                  onAddressAdded={(newAddr) => setAddresses([newAddr, ...addresses])}
                  onAddressUpdated={(upd) => setAddresses(addresses.map((x) => (x.id === upd.id ? upd : x)))}
                />
              </div>
            </>
          )}
        </main>
      </div>
    )
}

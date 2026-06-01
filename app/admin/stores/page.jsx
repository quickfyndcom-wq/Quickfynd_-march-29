'use client'
import { storesDummyData } from "@/assets/assets"
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import axios from "axios"

import toast from "react-hot-toast"


export default function AdminStores() {

    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                try {
                    const idToken = await getIdToken(firebaseUser, true) // Force refresh
                    setToken(idToken)
                } catch (error) {
                    console.error('Error getting token:', error);
                    setToken(null)
                }
            } else {
                setToken(null)
            }
            setAuthLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const getToken = async () => {
        if (token) return token;
        if (auth.currentUser) {
            try {
                const freshToken = await getIdToken(auth.currentUser, true); // Force refresh
                setToken(freshToken);
                return freshToken;
            } catch (error) {
                console.error('Error refreshing token:', error);
                return null;
            }
        }
        return null;
    }

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleteModal, setDeleteModal] = useState({ open: false, store: null })
    const [settingPrimaryId, setSettingPrimaryId] = useState(null)

    const fetchStores = async () => {
        try {
            const currentToken = await getToken()
            if (!currentToken) {
                toast.error('Please sign in to access admin panel');
                setLoading(false);
                return;
            }
            console.log('[ADMIN STORES CLIENT] Current user:', user?.email);
            console.log('[ADMIN STORES CLIENT] Token exists:', !!currentToken);
            console.log('[ADMIN STORES CLIENT] Token preview:', currentToken?.substring(0, 50) + '...');
            const { data } = await axios.get('/api/admin/stores', {headers: { Authorization: `Bearer ${currentToken}` }})
            setStores(data.stores)
        } catch (error) {
            console.error('Fetch stores error:', error);
            console.error('Error response:', error?.response?.data);
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const toggleIsActive = async (storeId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/admin/toggle-store', {storeId}, {headers: { Authorization: `Bearer ${token}` }})
            await fetchStores()
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (!authLoading && user && token) {
            fetchStores()
        }
    }, [authLoading, user, token])

    const handleDeleteStore = async (storeId) => {
        try {
            const token = await getToken();
            await axios.post('/api/admin/delete-store', { storeId }, { headers: { Authorization: `Bearer ${token}` }});
            toast.success('Store deleted successfully!');
            setDeleteModal({ open: false, store: null });
            fetchStores();
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
    }

    const handleSetPrimaryStore = async (storeId) => {
        try {
            setSettingPrimaryId(storeId)
            const token = await getToken()
            const { data } = await axios.patch('/api/admin/stores', { storeId }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data?.message || 'Primary store updated')
            setStores((prev) => prev.map((s) => ({ ...s, isPrimary: String(s._id) === String(storeId) })))
            await fetchStores()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setSettingPrimaryId(null)
        }
    }

    return (authLoading || loading) ? <Loading /> : (
        <div className="text-slate-500 mb-28">
            <h1 className="text-2xl">Live <span className="text-slate-800 font-medium">Stores</span></h1>

            {stores.length ? (
                <div className="flex flex-col gap-4 mt-4">
                    {stores.map((store) => (
                        (() => {
                            const isStorePrimary = Boolean(store.isPrimary) || stores.length === 1
                            return (
                        <div key={store._id} className={`relative rounded-lg shadow-sm p-6 flex max-md:flex-col gap-4 md:items-end max-w-4xl transition-all ${isStorePrimary ? 'bg-green-50 border-2 border-green-500' : 'bg-white border border-slate-200'}`}>
                            {/* Primary badge (top-right corner) */}
                            {isStorePrimary && (
                                <span className="absolute top-3 right-4 inline-flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                                    ⭐ Primary Store
                                </span>
                            )}

                            {/* Store Info */}
                            <StoreInfo store={{ ...store, isPrimary: isStorePrimary }} />

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2 flex-wrap">
                                {!isStorePrimary && (
                                    <button
                                        className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
                                        onClick={() => handleSetPrimaryStore(store._id)}
                                        disabled={settingPrimaryId === store._id}
                                    >
                                        {settingPrimaryId === store._id ? 'Setting...' : 'Set as Primary'}
                                    </button>
                                )}
                                <p>Active</p>
                                <label className="relative inline-flex items-center cursor-pointer text-gray-900">
                                    <input type="checkbox" className="sr-only peer" onChange={() => toast.promise(toggleIsActive(store._id), { loading: "Updating data..." })} checked={store.isActive} />
                                    <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                                    <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                </label>
                                <button
                                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                                    onClick={() => setDeleteModal({ open: true, store })}
                                >Delete Store</button>
                            </div>
                        </div>
                            )
                        })()
                    ))}

                </div>
            ) : (
                <div className="flex items-center justify-center h-80">
                    <h1 className="text-3xl text-slate-400 font-medium">No stores Available</h1>
                </div>
            )
            }

            {/* Delete Confirmation Modal */}
            {deleteModal.open && deleteModal.store && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 text-red-700">Delete Store</h2>
                        <p className="mb-6">Are you sure you want to delete <span className="font-semibold">{deleteModal.store.name}</span>? This will remove the store and all its products and orders. This action cannot be undone.</p>
                        <div className="flex gap-4 justify-end">
                            <button className="px-4 py-2 bg-gray-200 rounded-lg" onClick={() => setDeleteModal({ open: false, store: null })}>Cancel</button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition" onClick={() => handleDeleteStore(deleteModal.store._id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
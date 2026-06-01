'use client'
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import axios from "axios"

export default function CheckAuth() {
    const [user, setUser] = useState(null)
    const [adminCheck, setAdminCheck] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                try {
                    const token = await getIdToken(firebaseUser)
                    const { data } = await axios.get('/api/admin/is-admin', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    setAdminCheck(data)
                } catch (error) {
                    setAdminCheck({ error: error?.response?.data || error.message })
                }
            }
            setLoading(false)
        })
        return () => unsubscribe()
    }, [])

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="p-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Admin Authentication Check</h1>
            
            <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                <div>
                    <h2 className="font-semibold text-lg mb-2">Current User:</h2>
                    {user ? (
                        <div className="space-y-1">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>UID:</strong> {user.uid}</p>
                            <p><strong>Display Name:</strong> {user.displayName || 'N/A'}</p>
                        </div>
                    ) : (
                        <p className="text-red-600">Not logged in</p>
                    )}
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">Admin Check Result:</h2>
                    <pre className="bg-white p-4 rounded border overflow-auto text-sm">
                        {JSON.stringify(adminCheck, null, 2)}
                    </pre>
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">Environment Admin Email:</h2>
                    <p className="bg-white p-4 rounded border">
                        {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'Not set'}
                    </p>
                </div>

                <div>
                    <h2 className="font-semibold text-lg mb-2">Expected Behavior:</h2>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Your logged-in email must match the admin email in .env</li>
                        <li>Admin check should return: {`{ "isAdmin": true }`}</li>
                        <li>If you see an error, check the terminal logs for details</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

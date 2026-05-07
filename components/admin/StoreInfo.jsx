'use client'
import Image from "next/image"
import { MapPin, Mail, Phone } from "lucide-react"

const StoreInfo = ({store}) => {
    return (
        <div className="flex-1 space-y-2 text-sm">
            <Image width={100} height={100} src={store.logo} alt={store.name} unoptimized className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto" />
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <h3 className="text-xl font-semibold text-slate-800"> {store.name} </h3>
                <span className="text-sm">@{store.username}</span>

                {/* Status Badge */}
                <span
                    className={`text-xs font-semibold px-4 py-1 rounded-full ${store.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : store.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}
                >
                    {store.status}
                </span>
                {store.isPrimary && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                        Primary Store
                    </span>
                )}
            </div>

            <p className="text-slate-600 my-5 max-w-2xl">{store.description}</p>
            <p className="flex items-center gap-2"> <MapPin size={16} /> {store.address}</p>
            <p className="flex items-center gap-2"><Phone size={16} /> {store.contact}</p>
            <p className="flex items-center gap-2"><Mail size={16} />  {store.email}</p>
            {store.returnAddress && <p className="text-slate-600"><span className="font-medium">Return Address:</span> {store.returnAddress}</p>}
            {store.gst && <p className="text-slate-600"><span className="font-medium">GST:</span> {store.gst}</p>}
            {store.customerId && <p className="text-slate-600"><span className="font-medium">Customer/Contract ID:</span> {store.customerId}</p>}
            {store.businessHours && <p className="text-slate-600"><span className="font-medium">Business Hours:</span> {store.businessHours}</p>}
            {store.website && (
                <p className="text-slate-600">
                    <span className="font-medium">Website:</span>{' '}
                    <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{store.website}</a>
                </p>
            )}
            <p className="text-slate-700 mt-5">Applied  on <span className="text-xs">{new Date(store.createdAt).toLocaleDateString()}</span> by</p>
                        <div className="flex items-center gap-2 text-sm ">
                                {store.user.image ? (
                                    <Image
                                        width={36}
                                        height={36}
                                        src={store.user.image}
                                        alt={store.user.name}
                                        unoptimized
                                        className="w-9 h-9 rounded-full"
                                    />
                                ) : (
                                    <span className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-400 text-white font-bold text-lg">
                                        {store.user.name?.[0]?.toUpperCase() || store.user.email?.[0]?.toUpperCase() || "U"}
                                    </span>
                                )}
                                <div>
                                        <p className="text-slate-600 font-medium">{store.user.name}</p>
                                        <p className="text-slate-400">{store.user.email}</p>
                                </div>
                        </div>
        </div>
    )
}

export default StoreInfo
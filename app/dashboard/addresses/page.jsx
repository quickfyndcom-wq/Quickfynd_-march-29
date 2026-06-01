"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import PageTitle from '@/components/PageTitle';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false
  });
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/sign-in');
      } else {
        fetchAddresses(user.uid);
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const fetchAddresses = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/addresses?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    try {
      const endpoint = editingId 
        ? `/api/addresses?id=${editingId}`
        : '/api/addresses';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: user.uid
        })
      });

      if (response.ok) {
        toast.success(editingId ? 'Address updated' : 'Address added');
        setFormData({
          name: '',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          isDefault: false
        });
        setShowForm(false);
        setEditingId(null);
        fetchAddresses(user.uid);
      } else {
        toast.error('Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Error saving address');
    }
  };

  const handleEdit = (address) => {
    setFormData(address);
    setEditingId(address._id);
    setShowForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await fetch(`/api/addresses?id=${addressId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Address deleted');
        const user = auth.currentUser;
        if (user) fetchAddresses(user.uid);
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Error deleting address');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <PageTitle title="My Addresses" />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  name: '',
                  phone: '',
                  addressLine1: '',
                  addressLine2: '',
                  city: '',
                  state: '',
                  pincode: '',
                  isDefault: false
                });
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add Address
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                    handleInputChange({ target: { name: 'phone', value } });
                  }}
                  maxLength="15"
                  pattern="[0-9]{7,15}"
                  title="Phone number must be 7-15 digits"
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <input
                type="text"
                name="addressLine1"
                placeholder="Address Line 1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <input
                type="text"
                name="addressLine2"
                placeholder="Address Line 2 (Optional)"
                value={formData.addressLine2}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  name="pincode"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleInputChange({ target: { name: 'pincode', value } });
                  }}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Set as default address</span>
              </label>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {editingId ? 'Update Address' : 'Add Address'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No addresses saved yet</p>
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Your First Address
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address._id}
                className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                  address.isDefault ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                {address.isDefault && (
                  <div className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mb-2">
                    Default
                  </div>
                )}
                <h3 className="font-bold text-lg text-gray-900">{address.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                <p className="text-sm text-gray-600">{address.addressLine1}</p>
                {address.addressLine2 && (
                  <p className="text-sm text-gray-600">{address.addressLine2}</p>
                )}
                <p className="text-sm text-gray-600">
                  {address.city}, {address.state} {address.pincode}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(address)}
                    className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address._id)}
                    className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

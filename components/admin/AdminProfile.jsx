import { useState } from 'react';
import axios from 'axios';

export default function AdminProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      if (image) formData.append('image', image);
      const res = await axios.post('/api/admin/update-profile', formData);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Admin Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Profile Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full" />}
        </div>
        <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {message && <div className="mt-2 text-sm text-center text-green-600">{message}</div>}
      </form>
    </div>
  );
}

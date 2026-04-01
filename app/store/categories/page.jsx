'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus, FiEdit2, FiX, FiSearch, FiCheckCircle } from 'react-icons/fi';
import { MdEdit, MdCategory, MdOutlineCheckCircleOutline } from 'react-icons/md';
import Loading from '@/components/Loading';

const MAX_CATEGORIES = 10;

export default function StoreCategoryMenu() {
  const { user, getToken } = useAuth();
  const [categories, setCategories] = useState([]);
  const [existingCategories, setExistingCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    image: '',
    url: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const normalizeText = (value = '') =>
    String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const normalizeCategoryUrl = (value = '') =>
    String(value)
      .trim()
      .toLowerCase()
      .replace(/\/+$/, '');

  const isDuplicateCategory = (name, url, excludeIndex = null) => {
    const normalizedName = normalizeText(name);
    const normalizedUrl = normalizeCategoryUrl(url);

    return categories.some((category, index) => {
      if (excludeIndex !== null && index === excludeIndex) return false;
      return (
        normalizeText(category?.name) === normalizedName ||
        normalizeCategoryUrl(category?.url) === normalizedUrl
      );
    });
  };

  // Fetch categories from store
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Fetch custom store menu categories
      const { data } = await axios.get('/api/store/category-menu', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(data.categories || []);

      // Fetch existing system categories
      try {
        const existingRes = await axios.get('/api/store/categories');
        setExistingCategories(existingRes.data.categories || []);
      } catch (error) {
        console.log('No existing categories');
        setExistingCategories([]);
      }
    } catch (error) {
      console.log('First load or no categories yet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset previously saved URL when a new file is selected.
      setFormData(prev => ({ ...prev, image: '' }));
      setImageMode('upload');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image URL paste
  const handleImageUrlInput = (e) => {
    const url = e.target.value;
    setImageUrlInput(url);
    setImagePreview(url);
    setFormData(prev => ({ ...prev, image: url }));
  };

  const extractUploadedImageUrl = (uploadResponse) => {
    return (
      uploadResponse?.data?.urls?.[0] ||
      uploadResponse?.data?.url ||
      ''
    );
  };

  const handleUploadImageOnly = async () => {
    if (!imageFile) {
      toast.error('Please select an image first');
      return;
    }

    try {
      setImageUploading(true);
      const token = await getToken();
      const uploadFormData = new FormData();
      uploadFormData.append('files', imageFile);

      const uploadRes = await axios.post('/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedUrl = extractUploadedImageUrl(uploadRes);
      if (!uploadedUrl) {
        throw new Error('Image upload failed: server returned no URL');
      }

      setFormData(prev => ({ ...prev, image: uploadedUrl }));
      setImagePreview(uploadedUrl);
      setImageFile(null);
      toast.success('Image uploaded. Now click Add Category.');
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to upload image');
      console.error(error);
    } finally {
      setImageUploading(false);
    }
  };

  // Save category
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url) {
      toast.error('Name and URL are required');
      return;
    }

    if (isDuplicateCategory(formData.name, formData.url, editingIdx)) {
      toast.error('This category is already added');
      return;
    }

    if (!imageFile && !formData.image) {
      toast.error('Image is required');
      return;
    }

    try {
      setUploading(true);
      const token = await getToken();
      let imageUrl = formData.image;

      // Upload image if new file selected
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('files', imageFile);
        const uploadRes = await axios.post('/api/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        imageUrl = extractUploadedImageUrl(uploadRes);
        if (!imageUrl) {
          throw new Error('Image upload failed: server returned no URL');
        }
      }

      let updatedCategories;
      if (editingIdx !== null) {
        // Update existing category
        updatedCategories = [...categories];
        updatedCategories[editingIdx] = {
          name: formData.name,
          image: imageUrl,
          url: formData.url,
        };
        toast.success('Category updated!');
      } else {
        // Add new category
        updatedCategories = [
          ...categories,
          {
            name: formData.name,
            image: imageUrl,
            url: formData.url,
          },
        ];
        toast.success('Category added!');
      }

      // Save to backend
      await axios.post('/api/store/category-menu', { categories: updatedCategories }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCategories(updatedCategories);
      handleCancel();
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to save category');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Delete category
  const handleDelete = async (idx) => {
    if (!confirm('Are you sure you want to remove this category?')) return;

    try {
      const token = await getToken();
      const updatedCategories = categories.filter((_, i) => i !== idx);
      
      await axios.post('/api/store/category-menu', { categories: updatedCategories }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCategories(updatedCategories);
      toast.success('Category removed');
    } catch (error) {
      toast.error('Failed to remove category');
    }
  };

  // Edit category
  const handleEdit = (idx) => {
    const cat = categories[idx];
    setFormData({
      name: cat.name,
      image: cat.image,
      url: cat.url,
    });
    setImagePreview(cat.image);
    setEditingIdx(idx);
    setShowForm(true);
  };;

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingIdx(null);
    setFormData({ name: '', image: '', url: '' });
    setImageFile(null);
    setImagePreview('');
    setImageUrlInput('');
    setImageMode('upload');
  };

  // Organize categories by parent-child relationships
  const organizeCategoriesByParent = (categories) => {
    const parentCategories = categories.filter(cat => !cat.parentId);
    return parentCategories.map(parent => ({
      ...parent,
      children: categories.filter(cat => cat.parentId === parent._id)
    }));
  };

  const filteredExistingCategories = existingCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hierarchicalCategories = organizeCategoriesByParent(filteredExistingCategories);

  if (loading) return <Loading />;
  if (!user) return <div className="p-6 text-red-500">Please login</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <MdCategory className="text-3xl text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Store Categories</h1>
            <p className="text-slate-500 mt-1">{categories.length}/{MAX_CATEGORIES} active &nbsp;·&nbsp; {existingCategories.length} system categories available</p>
          </div>
        </div>

        {/* Add Category Button */}
        {categories.length < MAX_CATEGORIES && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl transition-all duration-200 font-semibold"
            >
              <FiPlus size={20} />
              Add New Category
            </button>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingIdx !== null ? '✏️ Edit Category' : '➕ Add New Category'}
                </h2>
                <button onClick={handleCancel} className="p-2 hover:bg-blue-500 rounded-lg transition text-white">
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-8">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Women's Fashion, Electronics, Home & Garden"
                    className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* URL Field */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Category URL *</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="e.g., /shop?category=women-s-fashion"
                    className="w-full px-5 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Image Upload */}
                <div className="border-t-2 border-slate-100 pt-6">
                  <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Category Image *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1">
                      <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 hover:border-blue-500 transition cursor-pointer bg-slate-50">
                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="flex flex-col items-center justify-center text-center">
                          <FiPlus className="text-3xl text-slate-400 mb-3" />
                          <p className="text-sm font-semibold text-slate-700">Click to upload</p>
                          <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                          <p className="text-xs text-slate-400 mt-2">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUploadImageOnly}
                          disabled={!imageFile || imageUploading}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-semibold"
                        >
                          {imageUploading ? 'Uploading...' : 'Upload & Save Image'}
                        </button>
                        {formData.image && !imageFile && (
                          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                            Image saved
                          </span>
                        )}
                      </div>
                    </div>
                    {imagePreview && (
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="relative">
                          <img src={imagePreview} alt="Preview" className="w-40 h-40 object-cover rounded-xl border-2 border-blue-200 shadow-lg" />
                          <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1">
                            <MdOutlineCheckCircleOutline className="text-white text-xl" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                  >
                    {uploading ? '⏳ Saving...' : editingIdx !== null ? '💾 Update Category' : '✨ Add Category'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition font-semibold"
                  >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* My Categories Grid */}
            {categories.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-slate-700 mb-4">My Store Navigation Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100">
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-300" />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{cat.name}</h3>
                        <p className="text-xs text-blue-600 mb-4 line-clamp-1 font-mono bg-blue-50 p-2 rounded-lg">{cat.url}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(idx)} className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition text-sm">
                            <FiEdit2 size={14} /> Edit
                          </button>
                          <button onClick={() => handleDelete(idx)} className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition text-sm">
                            <FiTrash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browse System Categories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-700">Browse System Categories</h2>
                <span className="text-sm text-slate-500">{existingCategories.length} available</span>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-slate-900 placeholder-slate-400"
                />
              </div>

              {hierarchicalCategories.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                  <p className="text-xl font-bold text-slate-700">No Categories Found</p>
                  <p className="text-slate-500 mt-2">Try adjusting your search terms</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {hierarchicalCategories.map((parent, parentIdx) => {
                    const parentUrl = `/shop?category=${parent.slug}`;
                    const parentAlreadyAdded = isDuplicateCategory(parent.name, parentUrl);

                    return (
                      <div key={parentIdx} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                          <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                            {parent.image ? (
                              <img src={parent.image} alt={parent.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-bold text-emerald-600">{parent.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{parent.name}</p>
                            {parent.slug && <p className="text-xs text-slate-500 font-mono">{parent.slug}</p>}
                            {parent.children?.length > 0 && (
                              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">{parent.children.length} subcategories</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (parentAlreadyAdded) return;
                              setFormData({ name: parent.name, image: parent.image || '', url: parentUrl });
                              setImagePreview(parent.image || '');
                              setShowForm(true);
                            }}
                            disabled={parentAlreadyAdded}
                            className={`px-4 py-2 rounded-lg transition font-semibold text-sm flex items-center gap-2 whitespace-nowrap ${
                              parentAlreadyAdded
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <FiCheckCircle size={14} /> {parentAlreadyAdded ? 'Added' : 'Use'}
                          </button>
                        </div>

                        {parent.children?.length > 0 && (
                          <div className="p-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Subcategories</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {parent.children.map((child, childIdx) => {
                                const childUrl = `/shop?category=${child.slug}`;
                                const childAlreadyAdded = isDuplicateCategory(child.name, childUrl);

                                return (
                                  <div key={childIdx} className="group bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all overflow-hidden">
                                    <div className="relative h-24 overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                                      {child.image ? (
                                        <img src={child.image} alt={child.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      ) : (
                                        <span className="text-3xl font-bold text-blue-300">{child.name?.charAt(0)}</span>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
                                      <span className="absolute top-1.5 right-1.5 bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">Child</span>
                                    </div>
                                    <div className="p-2.5">
                                      <p className="font-semibold text-slate-800 text-xs line-clamp-1 mb-1">{child.name}</p>
                                      {child.slug && <p className="text-[10px] text-slate-400 font-mono truncate mb-2">{child.slug}</p>}
                                      <button
                                        onClick={() => {
                                          if (childAlreadyAdded) return;
                                          setFormData({ name: child.name, image: child.image || '', url: childUrl });
                                          setImagePreview(child.image || '');
                                          setShowForm(true);
                                        }}
                                        disabled={childAlreadyAdded}
                                        className={`w-full py-1.5 font-semibold rounded-lg transition text-xs flex items-center justify-center gap-1 ${
                                          childAlreadyAdded
                                            ? 'text-slate-500 bg-slate-200 cursor-not-allowed'
                                            : 'text-blue-600 hover:bg-blue-50'
                                        }`}
                                      >
                                        <FiCheckCircle size={11} /> {childAlreadyAdded ? 'Added' : 'Use This'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
      </div>
    </div>
  );
}

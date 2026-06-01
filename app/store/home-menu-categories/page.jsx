'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/useAuth';

export default function HomeMenuCategories() {
  const { getToken, user, loading: authLoading } = useAuth();
  const [itemCount, setItemCount] = useState(6);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showSettingsHeader] = useState(true);

  // Fetch all available categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        console.log('Categories API response:', data);
        
        // Handle the correct format from /api/categories
        if (data.categories && Array.isArray(data.categories)) {
          // Filter to only parent categories (no children)
          const parentCategories = data.categories.filter(cat => !cat.parentId);
          console.log('Parent categories:', parentCategories);
          setCategories(parentCategories);
        } else if (data.data && Array.isArray(data.data)) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.warn('Unexpected categories response format:', data);
          setCategories([]);
        }
        setMessage({ type: '', text: '' });
      } catch (error) {
        console.error('Error fetching categories:', error);
        setMessage({ type: 'error', text: 'Failed to load categories' });
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const normalizeItems = (count, existingItems = []) => {
    const normalized = [...existingItems];
    if (count > normalized.length) {
      for (let i = normalized.length; i < count; i++) {
        normalized.push({
          id: i,
          name: '',
          image: '',
          url: '',
          categoryId: '',
          imageFile: null,
        });
      }
    } else if (count < normalized.length) {
      normalized.splice(count);
    }
    return normalized;
  };

  // Load saved configuration
  useEffect(() => {
    if (configLoaded || authLoading) return;
    if (!user) {
      setItems(normalizeItems(itemCount, []));
      setConfigLoaded(true);
      return;
    }
    const loadConfiguration = async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const response = await fetch('/api/store/home-menu-categories', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          const count = data.count || 6;
          const existingItems = Array.isArray(data.items) ? data.items : [];
          setItemCount(count);
          setItems(normalizeItems(count, existingItems));
          setConfigLoaded(true);
        } else {
          setItems(normalizeItems(itemCount, []));
          setConfigLoaded(true);
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        setItems(normalizeItems(itemCount, []));
        setConfigLoaded(true);
      } finally {
      }
    };

    loadConfiguration();
  }, [configLoaded, getToken, authLoading, user, itemCount]);

  // Update item count
  const handleItemCountChange = (newCount) => {
    setItemCount(newCount);
    setItems(normalizeItems(newCount, items));
    setFieldErrors({});
  };

  // Handle image upload with compression
  const handleImageUpload = (index, file) => {
    if (file.size > 2000000) { // 2MB limit per image
      setMessage({ type: 'error', text: `❌ Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please compress to under 2MB.` });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newItems = [...items];
      newItems[index].image = reader.result;
      newItems[index].imageFile = file;
      newItems[index].isBase64 = true; // Mark as base64 - needs uploading
      setItems(newItems);
      setFieldErrors((prev) => {
        if (!prev[index]) return prev;
        const { image, ...rest } = prev[index];
        const next = { ...prev };
        if (Object.keys(rest).length === 0) {
          delete next[index];
        } else {
          next[index] = rest;
        }
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle input changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    setFieldErrors((prev) => {
      if (!prev[index]) return prev;
      const { [field]: _removed, ...rest } = prev[index];
      const next = { ...prev };
      if (Object.keys(rest).length === 0) {
        delete next[index];
      } else {
        next[index] = rest;
      }
      return next;
    });
  };

  // Save configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      setFieldErrors({});
      
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }
      
      // Validate items (only validate filled items; skip empty slots)
      const filledItems = items.slice(0, itemCount).map((item, index) => ({ item, index })).filter(({ item }) => {
        const hasAnyValue =
          (item.name && item.name.trim()) ||
          item.image ||
          (item.url && item.url.trim()) ||
          (item.categoryId && item.categoryId.trim());
        return Boolean(hasAnyValue);
      });

      if (filledItems.length === 0) {
        throw new Error('Please fill at least one category before saving');
      }

      const nextErrors = {};
      const validItems = [];

      filledItems.forEach(({ item, index }) => {
        const errors = {};
        if (!item.name || !item.name.trim()) {
          errors.name = 'Name is required';
        }
        if (!item.image) {
          errors.image = 'Image is required';
        }
        if (item.categoryId === 'select-category') {
          errors.categoryId = 'Category is required';
        }

        const hasValidUrl = item.url && item.url.trim() && item.url !== 'select-category';
        const hasValidCategoryId = item.categoryId && item.categoryId.trim() && item.categoryId !== 'select-category';

        if (Object.keys(errors).length > 0) {
          nextErrors[index] = errors;
          return;
        }

        // Remove base64 image from validItems - will be uploaded separately
        const { imageFile, ...itemWithoutFile } = item;
        
        validItems.push({
          ...itemWithoutFile,
          // Only include image if it's NOT base64 (i.e., already a URL)
          image: item.image && !item.image.startsWith('data:') ? item.image : item.image,
          url: hasValidUrl ? item.url : null,
          categoryId: hasValidCategoryId ? item.categoryId : null,
        });
      });

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        setMessage({ type: 'error', text: '❌ Please fix the highlighted fields before saving.' });
        return;
      }

      // Upload base64 images to ImageKit first
      console.log('Uploading images...');
      const itemsWithUploadedImages = await Promise.all(
        validItems.map(async (item, idx) => {
          // Only upload if image is base64 (starts with 'data:')
          if (item.image && item.image.startsWith('data:')) {
            try {
              console.log(`Uploading image ${idx}...`);
              
              // Upload base64 directly to our endpoint
              const uploadRes = await fetch('/api/store/upload-category-image', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                  base64Image: item.image,
                  fileName: `category-${idx}-${Date.now()}`,
                }),
              });

              if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                console.error(`Image ${idx} upload failed (${uploadRes.status}):`, errorText);
                throw new Error(`Image upload failed: ${errorText}`);
              }

              const uploadedData = await uploadRes.json();
              console.log(`Image ${idx} uploaded:`, uploadedData.url);
              console.log(`Full upload response:`, uploadedData);

              if (!uploadedData.url) {
                throw new Error(`No URL returned from upload: ${JSON.stringify(uploadedData)}`);
              }

              return {
                ...item,
                image: uploadedData.url,
              };
            } catch (uploadErr) {
              console.error(`Image ${idx} upload error:`, uploadErr);
              throw new Error(`Failed to upload image ${idx + 1}: ${uploadErr.message}`);
            }
          }
          // Item already has a URL, no upload needed
          return item;
        })
      );

      console.log('All images uploaded, saving configuration...');

      const response = await fetch('/api/store/home-menu-categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          count: itemCount,
          items: itemsWithUploadedImages,
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedCount = saved?.data?.items?.length || 0;
        const savedConfig = saved?.data || null;
        if (savedConfig?.count) {
          setItemCount(savedConfig.count);
        }
        if (Array.isArray(savedConfig?.items)) {
          setItems(normalizeItems(savedConfig.count || itemCount, savedConfig.items));
        }
        setMessage({ type: 'success', text: `✅ Configuration saved successfully! (Saved ${savedCount} items)` });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: `❌ ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (!configLoaded) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#111827' }}>
            🏠 Home Menu Categories
          </h1>
          <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>
            Configure the categories section displayed on your home page
          </p>
        </div>
        <a
          href="/store/storefront/home-menu-categories"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </a>
      </div>

      {/* Message */}
      {message.text && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Debug Info */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '12px',
        color: '#0c4a6e',
      }}>
        📊 Categories loaded: {categories.length} | Items configured: {items.length} / {itemCount}
      </div>

      {/* Item Count Selection */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
          Select Number of Categories
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[6, 8, 10, 12, 14].map((count) => (
            <button
              key={count}
              onClick={() => handleItemCountChange(count)}
              style={{
                padding: '12px 24px',
                border: '2px solid',
                borderColor: itemCount === count ? '#0891b2' : '#d1d5db',
                borderRadius: '8px',
                backgroundColor: itemCount === count ? '#0891b2' : 'white',
                color: itemCount === count ? 'white' : '#374151',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              {count} Categories
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {items.slice(0, itemCount).map((item, index) => (
          <div
            key={index}
            style={{
              padding: '24px',
              border: `2px solid ${fieldErrors[index] ? '#fca5a5' : '#e5e7eb'}`,
              borderRadius: '12px',
              backgroundColor: '#f9fafb',
            }}
          >
            {/* Item Number */}
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
              Category {index + 1}
            </h3>

            {/* Name Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>
                Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Electronics"
                value={item.name}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${fieldErrors[index]?.name ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors[index]?.name ? (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                  {fieldErrors[index].name}
                </div>
              ) : null}
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>
                Image *
              </label>
              {item.image ? (
                <div style={{ marginBottom: '8px', position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleItemChange(index, 'image', '')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px dashed ${fieldErrors[index]?.image ? '#ef4444' : '#0891b2'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              />
              {fieldErrors[index]?.image ? (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                  {fieldErrors[index].image}
                </div>
              ) : null}
            </div>

            {/* Navigation Type Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>
                Navigation Type
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const newItems = [...items];
                    newItems[index].categoryId = '';
                    newItems[index].url = '';
                    setItems(newItems);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid',
                    borderColor: !item.categoryId ? '#0891b2' : '#d1d5db',
                    borderRadius: '6px',
                    backgroundColor: !item.categoryId ? '#0891b2' : 'white',
                    color: !item.categoryId ? 'white' : '#374151',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Custom URL
                </button>
                <button
                  onClick={() => {
                    const newItems = [...items];
                    newItems[index].categoryId = 'select-category';
                    newItems[index].url = '';
                    setItems(newItems);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid',
                    borderColor: item.categoryId && item.categoryId !== '' ? '#0891b2' : '#d1d5db',
                    borderRadius: '6px',
                    backgroundColor: item.categoryId && item.categoryId !== '' ? '#0891b2' : 'white',
                    color: item.categoryId && item.categoryId !== '' ? 'white' : '#374151',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Select Category
                </button>
              </div>
            </div>

            {/* Custom URL or Category Select */}
            {!item.categoryId || item.categoryId === '' ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>
                  URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/category"
                  value={item.url}
                  onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>
                  Select Category *
                </label>
                {categories.length === 0 ? (
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '14px',
                    textAlign: 'center',
                  }}>
                    No categories available
                  </div>
                ) : (
                  <select
                    value={item.categoryId}
                    onChange={(e) => handleItemChange(index, 'categoryId', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${fieldErrors[index]?.categoryId ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Choose a category...</option>
                    {categories.map((cat) => (
                      <option key={cat._id || cat.id} value={cat.slug || cat._id || cat.id}>
                        {cat.name || cat.label || 'Unnamed Category'}
                      </option>
                    ))}
                  </select>
                )}
                {fieldErrors[index]?.categoryId ? (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: '600' }}>
                    {fieldErrors[index].categoryId}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '14px 40px',
            backgroundColor: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save Configuration'}
        </button>
      </div>
    </div>
  );
}

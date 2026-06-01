'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import toast from 'react-hot-toast';

const MAX_ITEMS = 12;

export default function NavbarMenuSettingsPage() {
  const { user, getToken, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState([{ label: '', url: '' }]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let isActive = true;

    const fetchSettings = async () => {
      try {
        const token = await getToken();
        const response = await fetch('/api/store/navbar-menu', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          if (isActive) setLoading(false);
          return;
        }
        const data = await response.json();
        if (!isActive) return;
        setEnabled(data.enabled ?? true);
        const nextItems = Array.isArray(data.items) && data.items.length > 0
          ? data.items
          : [{ label: '', url: '' }];
        setItems(nextItems);
      } catch (error) {
        console.error('Navbar menu fetch error:', error);
        toast.error('Failed to load navbar menu');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      isActive = false;
    };
  }, [authLoading, user?.uid]);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) {
      toast.error(`Maximum ${MAX_ITEMS} items allowed`);
      return;
    }
    setItems((prev) => [...prev, { label: '', url: '' }]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save changes');
      return;
    }

    const sanitized = items
      .map((item) => ({
        label: (item.label || '').trim(),
        url: (item.url || '').trim(),
      }))
      .filter((item) => item.label || item.url);

    if (sanitized.length === 0) {
      toast.error('Add at least one menu item');
      return;
    }

    for (let i = 0; i < sanitized.length; i += 1) {
      if (!sanitized[i].label || !sanitized[i].url) {
        toast.error(`Item ${i + 1}: label and URL are required`);
        return;
      }
    }

    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/store/navbar-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled, items: sanitized }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save menu');
      }

      toast.success('Navbar menu updated');
    } catch (error) {
      console.error('Navbar menu save error:', error);
      toast.error(error.message || 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <div className="p-6 text-slate-500">Please sign in to manage the navbar menu.</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Navbar Menu</h1>
            <p className="text-sm text-slate-500 mt-1">Manage the links shown below the main navbar.</p>
          </div>
          <a 
            href="/store/storefront/navbar-menu"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Navbar Settings
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <input
          id="navbar-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="navbar-enabled" className="text-sm text-slate-700">
          Enable navbar menu
        </label>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={`navbar-item-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1.2fr_1.6fr_auto] sm:items-center">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Label</label>
              <input
                type="text"
                value={item.label || ''}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
                placeholder="e.g. Bazaar"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">URL</label>
              <input
                type="text"
                value={item.url || ''}
                onChange={(e) => updateItem(index, 'url', e.target.value)}
                placeholder="/shop?category=bazaar"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Remove item"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addItem}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Add item
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save menu'}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-500">Max {MAX_ITEMS} items. Use relative URLs like /shop or /offers.</p>
    </div>
  );
}

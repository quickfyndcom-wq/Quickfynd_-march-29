'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BellIcon, ImagePlusIcon, SendIcon, HistoryIcon } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function AppNotificationsPage() {
  const { getToken } = useAuth();
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    targetUrl: '',
    topic: 'quickfynd_app_customers',
  });

  const canSend = useMemo(() => {
    return form.title.trim().length > 0 && form.message.trim().length > 0 && !sending;
  }, [form.title, form.message, sending]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/app-notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(data?.history || []);
    } catch (error) {
      toast.error('Failed to load notification history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const uploadImage = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const token = await getToken();
      const body = new FormData();
      body.append('image', file);
      body.append('type', 'banner');

      const { data } = await axios.post('/api/store/upload-image', body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data?.url) {
        throw new Error('Image URL missing in response');
      }

      setForm((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sendNotification = async () => {
    if (!canSend) return;

    try {
      setSending(true);
      const token = await getToken();
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        imageUrl: form.imageUrl.trim(),
        targetUrl: form.targetUrl.trim(),
        topic: form.topic.trim() || 'quickfynd_app_customers',
      };

      const { data } = await axios.post('/api/store/app-notifications', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(data?.message || 'Notification sent');
      setForm((prev) => ({ ...prev, title: '', message: '', targetUrl: '' }));
      loadHistory();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to send app notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <BellIcon className="text-slate-700" size={30} />
        <h1 className="text-3xl font-semibold text-slate-800">App Notifications</h1>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Send Push Notification</h2>
        <p className="mb-6 text-sm text-slate-500">
          Send a push notification to app customers. The mobile app should be subscribed to topic
          <span className="font-semibold text-slate-700"> {form.topic || 'quickfynd_app_customers'}</span>.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Big Summer Sale"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target URL (optional)</label>
            <input
              type="text"
              value={form.targetUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, targetUrl: e.target.value }))}
              placeholder="/offers or https://quickfynd.com/offers"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Tap to check limited-time offers now"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Topic</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder="quickfynd_app_customers"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Image (optional)</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <ImagePlusIcon size={16} />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage(e.target.files?.[0])}
                />
              </label>

              {form.imageUrl && (
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                >
                  Remove Image
                </button>
              )}
            </div>

            {form.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                <img src={form.imageUrl} alt="Notification" className="h-32 w-full rounded object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            disabled={!canSend}
            onClick={sendNotification}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendIcon size={16} />
            {sending ? 'Sending...' : 'Send to App Customers'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
            <HistoryIcon size={20} /> Send History
          </h2>
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingHistory ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications sent yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item._id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mb-2 text-sm text-slate-600">{item.message}</p>
                <p className="text-xs text-slate-500">
                  Topic: {item.topic} | {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.errorMessage && (
                  <p className="mt-1 text-xs text-red-600">Error: {item.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

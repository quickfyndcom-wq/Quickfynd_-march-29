'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Loading from '@/components/Loading'
import Link from 'next/link'
import DashboardSidebar from '@/components/DashboardSidebar'
import axios from 'axios'
import toast from 'react-hot-toast'
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export default function TicketsPage() {
  const [user, setUser] = useState(undefined)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, open, closed
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    category: 'Other',
    description: '',
    priority: 'normal',
    orderId: ''
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (user) {
      fetchTickets()
    } else if (user === null) {
      setLoading(false)
    }
  }, [user])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const token = await auth.currentUser.getIdToken(true)
      const { data } = await axios.get('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!formData.subject || !formData.description) {
      toast.error('Please fill in subject and description')
      return
    }

    if (formData.orderId && !/^[a-fA-F0-9]{24}$/.test(formData.orderId.trim())) {
      toast.error('Order number must be a valid ID')
      return
    }

    try {
      setSubmitting(true)
      const token = await auth.currentUser.getIdToken(true)
      await axios.post('/api/tickets', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Ticket created successfully!')
      setShowCreateModal(false)
      setFormData({
        subject: '',
        category: 'Other',
        description: '',
        priority: 'normal',
        orderId: ''
      })
      fetchTickets()
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error(error.response?.data?.error || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (user === undefined) return <Loading />

  if (user === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Support Tickets</h1>
        <p className="text-slate-600 mb-6">Please sign in to view your support tickets.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Home</Link>
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="text-blue-600" size={20} />
      case 'in-progress':
        return <Clock className="text-orange-600" size={20} />
      case 'resolved':
        return <CheckCircle className="text-green-600" size={20} />
      case 'closed':
        return <XCircle className="text-gray-600" size={20} />
      default:
        return <MessageSquare className="text-gray-600" size={20} />
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || colors.open}`}>
        {status.replace('-', ' ').toUpperCase()}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[priority] || colors.normal}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true
    if (filter === 'open') return ticket.status === 'open' || ticket.status === 'in-progress'
    if (filter === 'closed') return ticket.status === 'closed' || ticket.status === 'resolved'
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <main className="md:col-span-3">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Support Tickets</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Create New Ticket
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              filter === 'open'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            Open ({tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length})
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              filter === 'closed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            Closed ({tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length})
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center">
            <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Tickets Found</h2>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't created any support tickets yet." 
                : `No ${filter} tickets found.`}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
              Create Your First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket._id}
                href={`/dashboard/tickets/${ticket._id}`}
                className="block bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(ticket.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{ticket.subject}</h3>
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-medium text-blue-600">{ticket.category}</span>
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.replies && ticket.replies.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Create Support Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  >
                    <option value="Order Issue">Order Issue</option>
                    <option value="Product Question">Product Question</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order Number (Optional)</label>
                <input
                  type="text"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="If related to an order"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your issue in detail..."
                  rows="6"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-medium"
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

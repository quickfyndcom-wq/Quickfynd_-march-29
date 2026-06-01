'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Loading from '@/components/Loading'
import Link from 'next/link'
import DashboardSidebar from '@/components/DashboardSidebar'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle, MessageSquare } from 'lucide-react'

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyMessage, setReplyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (user && ticketId) {
      fetchTicket()
    } else if (user === null) {
      setLoading(false)
    }
  }, [user, ticketId])

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const token = await auth.currentUser.getIdToken(true)
      const { data } = await axios.get(`/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTicket(data.ticket)
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
      toast.error('Failed to load ticket')
      router.push('/dashboard/tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim()) return

    try {
      setSubmitting(true)
      const token = await auth.currentUser.getIdToken(true)
      const { data } = await axios.post(
        `/api/tickets/${ticketId}`,
        { message: replyMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTicket(data.ticket)
      setReplyMessage('')
      toast.success('Reply sent successfully')
    } catch (error) {
      console.error('Failed to send reply:', error)
      toast.error('Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return

    try {
      const token = await auth.currentUser.getIdToken(true)
      const { data } = await axios.patch(
        `/api/tickets/${ticketId}`,
        { status: 'closed' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTicket(data.ticket)
      toast.success('Ticket closed successfully')
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error('Failed to close ticket')
    }
  }

  if (user === undefined || loading) return <Loading />

  if (user === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Support Ticket</h1>
        <p className="text-slate-600 mb-6">Please sign in to view this ticket.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Home</Link>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-slate-600">Ticket not found</p>
        <Link href="/dashboard/tickets" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          Back to Tickets
        </Link>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[status] || colors.open}`}>
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
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[priority] || colors.normal}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
      <DashboardSidebar />
      <main className="md:col-span-3">
        <div className="mb-6">
          <Link
            href="/dashboard/tickets"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft size={16} />
            Back to Tickets
          </Link>
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 mb-2">{ticket.subject}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="font-medium text-blue-600">{ticket.category}</span>
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getPriorityBadge(ticket.priority)}
              {getStatusBadge(ticket.status)}
              {(ticket.status === 'open' || ticket.status === 'in-progress') && (
                <button
                  onClick={handleCloseTicket}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  <CheckCircle size={16} />
                  Close Ticket
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Original Message */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              {ticket.userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-slate-900">{ticket.userName || 'You'}</span>
                <span className="text-xs text-slate-500">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies && ticket.replies.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare size={20} />
              Replies ({ticket.replies.length})
            </h2>
            {ticket.replies.map((reply, index) => (
              <div
                key={index}
                className={`border rounded-xl shadow-sm p-6 ${
                  reply.sender === 'admin' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                      reply.sender === 'admin' ? 'bg-orange-600' : 'bg-blue-600'
                    }`}
                  >
                    {reply.sender === 'admin' ? 'A' : (reply.senderName?.[0]?.toUpperCase() || 'U')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900">
                        {reply.sender === 'admin' ? 'Support Team' : (reply.senderName || 'You')}
                      </span>
                      {reply.sender === 'admin' && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                          ADMIN
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{reply.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Add Reply</h3>
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !replyMessage.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send size={16} />
                  {submitting ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}

        {ticket.status === 'closed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 text-center">
            <CheckCircle className="mx-auto mb-3 text-gray-600" size={48} />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">This ticket is closed</h3>
            <p className="text-gray-600">
              Closed on {new Date(ticket.closedAt || ticket.updatedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

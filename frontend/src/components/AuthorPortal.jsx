import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { BookOpen, Send, Clock, CheckCircle2, MessageSquare, AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';

export default function AuthorPortal() {
  const { user, logout } = useAuth();
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'create', 'books'
  const [loading, setLoading] = useState(true);

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    book_id: '',
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [booksRes, ticketsRes] = await Promise.all([
        api.get('/author/books'),
        api.get('/author/tickets'),
      ]);
      setBooks(booksRes.data);
      setTickets(ticketsRes.data);
      if (ticketsRes.data.length > 0 && !selectedTicket) {
        setSelectedTicket(ticketsRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        book_id: newTicket.book_id || null,
        subject: newTicket.subject,
        description: newTicket.description,
      };
      const res = await api.post('/author/tickets', payload);
      setTickets([res.data, ...tickets]);
      setSelectedTicket(res.data);
      setNewTicket({ book_id: '', subject: '', description: '' });
      setActiveTab('tickets');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      const res = await api.post(`/author/tickets/${selectedTicket.id}/reply`, {
        message: replyMessage,
      });
      const updatedMessages = [...(selectedTicket.messages || []), res.data];
      const updatedTicket = { ...selectedTicket, messages: updatedMessages };
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      setReplyMessage('');
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">BookLeaf Publishing</h1>
            <p className="text-xs text-slate-400">Author Support Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-200">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      <div className="border-b border-slate-800 bg-slate-900/30 px-6 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'tickets' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'create' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Raise Ticket
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'books' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Published Books ({books.length})
          </button>
        </div>
        <button
          onClick={fetchInitialData}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-24 text-slate-400 text-sm">
            Loading portal data...
          </div>
        ) : activeTab === 'books' ? (
          /* Books View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((b) => (
              <div key={b.book_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {b.status}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{b.title}</h3>
                  <p className="text-xs text-slate-400">ISBN: {b.isbn || 'Pending Assignment'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
                  <div>
                    <span className="text-slate-500 block">Sold</span>
                    <span className="font-semibold text-slate-200">{b.total_copies_sold} copies</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Unpaid Royalty</span>
                    <span className="font-semibold text-emerald-400">₹{b.royalty_pending}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Royalty Paid</span>
                    <span className="font-semibold text-slate-300">₹{b.royalty_paid}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Last Payout</span>
                    <span className="font-semibold text-slate-300">{b.last_royalty_payout_date || 'None'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'create' ? (
          /* Create Ticket View */
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Create Support Request</h2>
            <p className="text-xs text-slate-400 mb-6">Our automated routing will prioritize and review your request.</p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Related Book (Optional)</label>
                <select
                  value={newTicket.book_id}
                  onChange={(e) => setNewTicket({ ...newTicket, book_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">General Account Inquiry (No Book)</option>
                  {books.map((b) => (
                    <option key={b.book_id} value={b.book_id}>
                      {b.title} ({b.book_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unpaid royalty for Q2 or Amazon listing down"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide all context, dates, and numbers to help our team assist you quickly."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-sm transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Tickets List & Detail Split View */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[750px]">
            {/* Sidebar list */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto p-3 space-y-2">
              {tickets.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">No tickets submitted yet.</div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-lg cursor-pointer border transition ${
                      selectedTicket?.id === t.id
                        ? 'bg-slate-800/90 border-emerald-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">{t.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate">{t.subject}</h4>
                    <p className="text-xs text-slate-400 truncate mt-1">{t.book_title}</p>
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Conversation detail */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-xl flex flex-col">
              {selectedTicket ? (
                <>
                  <div className="p-5 border-b border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">{selectedTicket.id}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                        {selectedTicket.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-400 mt-1">Book: {selectedTicket.book_title}</p>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {/* Original Issue */}
                    <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Original Issue Description:</p>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Replies */}
                    {selectedTicket.messages && selectedTicket.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl text-sm ${
                          m.sender_role === 'ADMIN'
                            ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-100 ml-4'
                            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="font-semibold text-slate-300">{m.sender_name}</span>
                          <span className="text-slate-500">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your response to the support team..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-semibold rounded-lg text-sm flex items-center gap-1.5 transition"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  Select a ticket from the left to view the details
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
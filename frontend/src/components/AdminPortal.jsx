import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Shield, Sparkles, Send, Lock, RefreshCw, Filter, Search } from 'lucide-react';

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  // Response & Note inputs
  const [adminReply, setAdminReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [advancingStatus, setAdvancingStatus] = useState('In Progress');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await api.get('/admin/tickets', { params });
      setTickets(res.data);
      if (res.data.length > 0 && !selectedTicket) {
        setSelectedTicket(res.data[0]);
        setAdminReply(res.data[0].ai_draft_response || '');
      }
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTicketAndSync = (t) => {
    setSelectedTicket(t);
    setAdminReply(t.ai_draft_response || '');
  };

  const handleOverrideAI = async (field, value) => {
    if (!selectedTicket) return;
    try {
      const res = await api.patch(`/admin/tickets/${selectedTicket.id}`, {
        [field]: value,
      });
      setSelectedTicket(res.data);
      setTickets(tickets.map(t => t.id === res.data.id ? res.data : t));
    } catch (err) {
      alert('Failed to update ticket metadata');
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedTicket) return;
    try {
      await api.post(`/admin/tickets/${selectedTicket.id}/reply`, {
        message: adminReply,
        new_status: advancingStatus,
      });
      // Refresh current ticket
      const res = await api.get(`/admin/tickets/${selectedTicket.id}`);
      setSelectedTicket(res.data);
      setTickets(tickets.map(t => t.id === res.data.id ? res.data : t));
      setAdminReply('');
      alert('Response sent to author!');
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNote.trim() || !selectedTicket) return;
    try {
      const res = await api.post(`/admin/tickets/${selectedTicket.id}/notes`, {
        note: internalNote,
      });
      const updatedNotes = [...(selectedTicket.internal_notes || []), res.data];
      const updatedTicket = { ...selectedTicket, internal_notes: updatedNotes };
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      setInternalNote('');
    } catch (err) {
      alert('Failed to add note');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">BookLeaf Admin Ops Desk</h1>
            <p className="text-xs text-slate-400">Operations & Author Resolution Center</p>
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

      {/* Control / Filter Bar */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search author, book, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 w-60 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <button
          onClick={fetchTickets}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl w-full mx-auto">
        {/* Ticket Queue List */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto h-[780px] p-3 space-y-2">
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading queue...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs">No matching tickets found.</div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTicketAndSync(t)}
                className={`p-4 rounded-xl cursor-pointer border transition ${
                  selectedTicket?.id === t.id
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{t.id}</span>
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      t.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      t.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {t.priority}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                      {t.status}
                    </span>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">{t.subject}</h4>
                <p className="text-xs text-slate-400 mt-1">Author: {t.author_name} ({t.author_email})</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
                  <span className="truncate">{t.category}</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Ticket Action Workspace */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[780px] overflow-hidden">
          {selectedTicket ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header & Override Controls */}
              <div className="border-b border-slate-800 pb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{selectedTicket.id}</span>
                    <h2 className="text-lg font-bold text-white mt-1">{selectedTicket.subject}</h2>
                    <p className="text-xs text-slate-400">
                      Author: <span className="text-slate-200">{selectedTicket.author_name}</span> | Book:{' '}
                      <span className="text-slate-200">{selectedTicket.book_title}</span>
                    </p>
                  </div>
                </div>

                {/* AI Overrides */}
                <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">AI Category (Override):</label>
                    <select
                      value={selectedTicket.category}
                      onChange={(e) => handleOverrideAI('category', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="Royalty & Payments">Royalty & Payments</option>
                      <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
                      <option value="Printing & Quality">Printing & Quality</option>
                      <option value="Distribution & Availability">Distribution & Availability</option>
                      <option value="Book Status & Production Updates">Book Status & Production Updates</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">AI Priority Score (Override):</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleOverrideAI('priority', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Author's Original Message */}
              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Author Query:</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Conversation Feed */}
              {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversation History:</p>
                  {selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl text-xs ${
                        m.sender_role === 'ADMIN'
                          ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-200'
                          : 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between font-semibold mb-1">
                        <span>{m.sender_name}</span>
                        <span className="text-slate-500">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Internal Notes Section */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" /> Internal Private Notes (Admin Only)
                </div>

                {selectedTicket.internal_notes && selectedTicket.internal_notes.map((n) => (
                  <div key={n.id} className="p-2.5 bg-slate-900 border border-amber-500/10 rounded text-xs text-slate-300">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="font-semibold text-amber-300/80">{n.admin_name}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p>{n.note}</p>
                  </div>
                ))}

                <form onSubmit={handleAddInternalNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an internal note for ops team..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!internalNote.trim()}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs font-semibold border border-amber-500/30 transition"
                  >
                    Save Note
                  </button>
                </form>
              </div>

              {/* AI Draft Response & Reply Composer */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Review & Edit Response (AI Pre-Drafted)
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Move Status To:</span>
                    <select
                      value={advancingStatus}
                      onChange={(e) => setAdvancingStatus(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSendAdminReply}
                    disabled={!adminReply.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Response to Author
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a ticket from the left queue to open details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

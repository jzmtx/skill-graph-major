import React, { useState, useEffect } from 'react';
import { inviteStudent, getPendingRequests, approveRequest } from '@/lib/tpoApi';
import { UserPlus, CheckCircle, Clock } from 'lucide-react';

export default function ConnectionManager({ authId }: { authId: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    try {
      const data = await getPendingRequests(authId);
      setRequests(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (authId) fetchRequests();
  }, [authId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await inviteStudent(authId, email);
      setMessage('Invitation sent successfully!');
      setEmail('');
      fetchRequests();
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Failed to send invitation');
    }
    setLoading(false);
  };

  const handleApprove = async (linkId: string) => {
    try {
      await approveRequest(authId, linkId);
      fetchRequests();
      // Ideally we would trigger a refresh of the main student list here too
    } catch (e) {
      console.error('Failed to approve request');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <UserPlus className="w-4 h-4" /> Manage Students
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Invite Form */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase">Invite Student by Email</h4>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu" 
              className="flex-1 text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500"
            />
            <button 
              disabled={loading}
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Invite'}
            </button>
          </form>
          {message && <p className="text-xs mt-2 text-indigo-600">{message}</p>}
        </div>

        {/* Pending Requests */}
        <div>
          <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Approvals ({requests.length})
          </h4>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No pending requests at the moment.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-100">
                  <div className="text-xs">
                    <p className="font-medium text-slate-700">{req.students?.name}</p>
                    <p className="text-slate-500">{req.students?.email}</p>
                  </div>
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                    title="Approve Request"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      setMessage('Invitation dispatched successfully.');
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
    } catch (e) {
      console.error('Failed to approve request');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-1.5">
        <UserPlus className="w-4 h-4 text-emerald-800" /> Student Verification & Invitations
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invite Form */}
        <div>
          <h4 className="text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Invite Student by Academic Email</h4>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@college.edu" 
              className="flex-1 text-xs border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 outline-none focus:border-emerald-800 focus:bg-white"
            />
            <button 
              disabled={loading}
              type="submit" 
              className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-2xs"
            >
              {loading ? 'Sending...' : 'Invite'}
            </button>
          </form>
          {message && <p className="text-xs mt-2 text-emerald-800 font-medium">{message}</p>}
        </div>

        {/* Pending Requests */}
        <div>
          <h4 className="text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Approvals ({requests.length})
          </h4>
          {requests.length === 0 ? (
            <p className="text-xs text-stone-400 italic pt-2">No pending verification requests.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-stone-50 p-2 rounded-lg border border-stone-200">
                  <div className="text-xs">
                    <p className="font-semibold text-stone-800">{req.students?.name}</p>
                    <p className="text-stone-500 text-[11px]">{req.students?.email}</p>
                  </div>
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Approve Affiliation"
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

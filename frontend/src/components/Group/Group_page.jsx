import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiUpload, FiMenu, FiLogOut, FiDownload, FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import { sessionManager } from '../../utils/sessionManager';

export default function Group_page() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState(null);
  const token = localStorage.getItem('accessToken');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const maxFileSizeBytes = 50 * 1024 * 1024;
  const maxTeamMembers = 10;

  const getMemberTone = (count) => {
    if (count >= maxTeamMembers) {
      return { text: '#991B1B', bg: '#FEE2E2' };
    }
    if (count >= maxTeamMembers - 2) {
      return { text: '#B45309', bg: '#FEF3C7' };
    }
    return { text: '#6B7280', bg: 'transparent' };
  };

  const readErrorMessage = async (response, fallback) => {
    try {
      const data = await response.json();
      if (Array.isArray(data?.message)) {
        return data.message.join(', ');
      }
      if (typeof data?.message === 'string') {
        return data.message;
      }
    } catch (err) {
      return fallback;
    }
    return fallback;
  };

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeId),
    [groups, activeId]
  );

  const isAdminOwner = currentUser.role === 'admin' || currentUser.role === 'owner';
  const isLeader = currentUser.role === 'leader';
  const isMember = currentUser.role === 'member';
  const isGroupMatch = currentUser.groupId && currentUser.groupId === activeId;
  const canUpload = isAdminOwner || (isLeader && isGroupMatch) || (isMember && currentUser.isApproved && isGroupMatch);
  const canViewDownload = isAdminOwner || ((isLeader || isMember) && isGroupMatch);
  const canEdit = isAdminOwner || (isLeader && isGroupMatch);
  const canDelete = isAdminOwner || (isLeader && isGroupMatch);

  // Filter groups based on user role
  const visibleGroups = useMemo(() => {
    // Everyone can see all teams to browse submissions
    return groups;
  }, [groups]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!token) {
        setError('Please sign in first.');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load groups');
        }
        const data = await response.json();
        setGroups(data);
        
        // Set active team - start with user's own team if they have one, otherwise first team
        if (currentUser.groupId) {
          setActiveId(currentUser.groupId);
        } else {
          setActiveId(data[0]?.id ?? '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [token]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!token || !activeId) {
        setSubmissions([]);
        return;
      }
      try {
        const response = await fetch(`/api/groups/${activeId}/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load submissions');
        }
        const data = await response.json();
        setSubmissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submissions');
      }
    };

    fetchSubmissions();
  }, [token, activeId]);

  const fetchPendingMembers = async () => {
    if (!token || currentUser.role !== 'leader') {
      return;
    }
    setPendingLoading(true);
    try {
      const response = await fetch('/api/users/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to load pending members');
      }
      const data = await response.json();
      setPendingMembers(data);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Failed to load pending members');
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMembers();
  }, [token, currentUser.role]);

  const handleUpload = async () => {
    if (!file || !activeId || !title) {
      setError('Please choose a file and add a title.');
      return;
    }
    if (file.size > maxFileSizeBytes) {
      setError('File is too large. Max size is 50MB.');
      return;
    }
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', activeId);
    formData.append('title', title);

    try {
      const response = await fetch('/api/submissions/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Upload failed');
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setSubmissions((prev) => [data, ...prev]);
      setFile(null);
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleEditClick = (submission) => {
    setEditingSubmission(submission);
    setEditTitle(submission.title || '');
    setEditFile(null);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingSubmission) {
      return;
    }
    if (!editTitle.trim()) {
      setError('Title is required.');
      return;
    }
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    if (editFile && editFile.size > maxFileSizeBytes) {
      setError('File is too large. Max size is 50MB.');
      return;
    }
    setError('');
    try {
      let response;
      if (editFile) {
        const formData = new FormData();
        formData.append('file', editFile);
        formData.append('title', editTitle.trim());
        response = await fetch(`/api/submissions/${editingSubmission.id}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch(`/api/submissions/${editingSubmission.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: editTitle.trim() }),
        });
      }
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Update failed');
        throw new Error(errorMessage);
      }
      const updated = await response.json();
      setSubmissions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setShowEditModal(false);
      setEditingSubmission(null);
      setEditFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (submissionId) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    const confirmed = window.confirm('Delete this submission? This action cannot be undone.');
    if (!confirmed) {
      return;
    }
    setError('');
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Delete failed');
        throw new Error(errorMessage);
      }
      setSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const rows = useMemo(() => {
    return submissions.map((item, index) => ({
      no: index + 1,
      id: item.id,
      title: item.title,
      fileUrl: item.fileUrl,
      date: new Date(item.submittedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
    }));
  }, [submissions]);

  const totalItems = rows.length;
  const submittedItems = rows.filter((row) => row.title).length;
  const pendingItems = Math.max(totalItems - submittedItems, 0);
  const fileName = file?.name || "No file selected";

  const handleSignOut = () => {
    sessionManager.clearSession();
    navigate('/');
  };

  const handleJoinTeam = async (groupId) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    try {
      const response = await fetch(`/api/users/${currentUser.id}/join-team`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ groupId }),
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Failed to join team');
        if (errorMessage.includes('Team is full')) {
          throw new Error('Team is full (max 10 members). Please choose another team.');
        }
        throw new Error(errorMessage);
      }
      // Update current user
      const updatedUser = await response.json();
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setShowTeamModal(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    }
  };

  const handleView = async (submissionId) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    try {
      const response = await fetch(`/api/submissions/${submissionId}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Failed to view file');
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('Content-Type');
      
      // Check if file type can be viewed in browser
      const viewableTypes = [
        'application/pdf',
        'image/',
        'text/',
        'video/',
        'audio/',
      ];
      
      const canView = viewableTypes.some(type => contentType?.startsWith(type));
      
      if (!canView) {
        setError('This file type cannot be previewed in the browser. Please use the Download button instead.');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up after a delay to allow the window to load
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view file');
    }
  };

  const handleDownload = async (submissionId, fileName) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    try {
      const response = await fetch(`/api/submissions/${submissionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Download failed');
        throw new Error(errorMessage);
      }
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFileName = fileName || 'download';
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          downloadFileName = matches[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleApprove = async (userId) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Failed to approve user');
        if (errorMessage.includes('Team is full')) {
          throw new Error('Team is full (max 10 members). Remove a member before approving.');
        }
        throw new Error(errorMessage);
      }
      // Remove from pending list
      setPendingMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    if (!token) {
      setError('Please sign in first.');
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}/reject`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Failed to reject user');
        throw new Error(errorMessage);
      }
      // Remove from pending list
      setPendingMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject user');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4 animate-pulse">
            <img 
              src="https://smis.cs.fs.rupp.edu.kh/rupp_logo.png" 
              alt="RUPP Logo" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <p className="text-slate-600 font-semibold mt-4">Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white" style={{borderColor: '#831717'}}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://smis.cs.fs.rupp.edu.kh/rupp_logo.png" 
              alt="RUPP Logo" 
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-base font-bold text-gray-900">Royal University of Phnom Penh</h1>
              <p className="text-xs text-gray-600">Group Submission System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, <span className="font-semibold text-gray-900">{currentUser.name}</span></span>
            {(currentUser.role === 'admin' || currentUser.role === 'owner') && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm font-semibold rounded transition text-white"
                style={{backgroundColor: '#831717'}}
                onMouseOver={(e) => e.target.style.backgroundColor = '#6B1214'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#831717'}
              >
                {currentUser.role === 'owner' ? 'Owner Dashboard' : 'Admin Dashboard'}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-semibold rounded transition"
              style={{color: '#831717', border: '1px solid #831717'}}
              onMouseOver={(e) => e.target.style.backgroundColor = '#FEE2E2'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Sign Out
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded text-gray-900"
          >
            <FiMenu size={24} />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t" style={{borderColor: '#E5E7EB'}}>
            <div className="px-6 py-4 space-y-3">
              <div className="text-sm text-gray-600 pb-2 border-b" style={{borderColor: '#E5E7EB'}}>
                Welcome, <span className="font-semibold text-gray-900">{currentUser.name}</span>
              </div>
              {(currentUser.role === 'admin' || currentUser.role === 'owner') && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-semibold rounded transition text-white"
                  style={{backgroundColor: '#831717'}}
                >
                  {currentUser.role === 'owner' ? 'Owner Dashboard' : 'Admin Dashboard'}
                </button>
              )}
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-sm font-semibold rounded transition flex items-center justify-center gap-2"
                style={{color: '#831717', border: '1px solid #831717'}}
              >
                <FiLogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* No Team Alert */}
          {!currentUser.groupId && (
            <div className="mb-8 p-6 rounded border-l-4" style={{backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900">No Team Selected</p>
                  <p className="text-xs text-yellow-800 mt-1">You haven't joined a team yet. Please select a team to get started.</p>
                </div>
                <button
                  onClick={() => setShowTeamModal(true)}
                  className="px-4 py-2 rounded font-semibold text-white hover:opacity-90 transition"
                  style={{backgroundColor: '#F59E0B'}}
                >
                  Choose Team
                </button>
              </div>
            </div>
          )}

          {/* Team Selection Modal */}
          {showTeamModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select Your Team</h2>
                <p className="text-sm text-gray-600 mb-6">Choose a team to join. You can change teams later.</p>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                  {groups.map((group) => {
                    const memberCount = group.memberCount ?? 0;
                    const isFull = memberCount >= maxTeamMembers;
                    const tone = getMemberTone(memberCount);
                    return (
                      <button
                        key={group.id}
                        onClick={() => handleJoinTeam(group.id)}
                        disabled={isFull}
                        className="w-full text-left p-4 border-2 rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{borderColor: '#E5E7EB'}}
                        onMouseOver={(e) => !isFull && (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                        onMouseOut={(e) => !isFull && (e.currentTarget.style.backgroundColor = 'transparent')}
                        title={isFull ? 'Team is full (max 10 members)' : 'Join team'}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{group.name}</p>
                          {isFull && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor: '#FEE2E2', color: '#991B1B'}}>
                              Full
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">Leader: {group.leaderName || 'TBD'}</p>
                        <p className="text-xs" style={{color: tone.text}}>Members: {memberCount}/{maxTeamMembers}</p>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="w-full px-4 py-2 border-2 rounded font-semibold transition"
                  style={{borderColor: '#E5E7EB', color: '#374151'}}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 max-w-7xl mx-auto">
          {/* Sidebar - Groups */}
          <aside className="h-fit">
            <div className="bg-white rounded border" style={{borderColor: '#E5E7EB'}}>
              <div className="p-4 border-b" style={{borderColor: '#E5E7EB'}}>
                <h2 className="font-bold text-gray-900">Teams</h2>
              </div>
              <div className="p-4 space-y-2">
                {visibleGroups.map((g) => {
                  const active = g.id === activeId;
                  const memberCount = g.memberCount ?? 0;
                  const isFull = memberCount >= maxTeamMembers;
                  const tone = getMemberTone(memberCount);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setActiveId(g.id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded text-sm transition"
                      style={{
                        backgroundColor: active ? '#831717' : 'transparent',
                        color: active ? 'white' : '#374151',
                        border: active ? 'none' : `1px solid #E5E7EB`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{g.name}</div>
                        {isFull && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{backgroundColor: active ? '#FECACA' : '#FEE2E2', color: '#991B1B'}}
                          >
                            Full
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{color: active ? '#FEE2E2' : '#6B7280'}}>
                        <span style={{color: active ? tone.text : tone.text}}>Members: {memberCount}/{maxTeamMembers}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-6">
            {activeGroup && (
              <div className="space-y-6">
                {/* Group Header */}
                <div className="rounded p-6" style={{backgroundColor: '#FEE2E2', borderLeft: '4px solid #831717'}}>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{activeGroup.name}</h2>
                  <p className="text-gray-700">Track and manage group submissions</p>
                  <p
                    className="text-sm mt-1"
                    style={{color: getMemberTone(activeGroup.memberCount ?? 0).text}}
                  >
                    Members: {activeGroup.memberCount ?? 0}/{maxTeamMembers}
                  </p>
                  {error && (
                    <div className="mt-4 p-3 rounded text-red-700 text-sm" style={{backgroundColor: '#FECACA', borderLeft: '4px solid #831717'}}>
                      {error}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded border p-4" style={{borderColor: '#E5E7EB'}}>
                    <p className="text-xs text-gray-600 mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                  </div>
                  <div className="bg-white rounded border p-4" style={{borderColor: '#E5E7EB'}}>
                    <p className="text-xs text-gray-600 mb-1">Submitted</p>
                    <p className="text-2xl font-bold" style={{color: '#831717'}}>{submittedItems}</p>
                  </div>
                  <div className="bg-white rounded border p-4" style={{borderColor: '#E5E7EB'}}>
                    <p className="text-xs text-gray-600 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingItems}</p>
                  </div>
                </div>

                {/* Pending Members Approval (Leaders Only - viewing their own team) */}
                {currentUser.role === 'leader' && currentUser.groupId === activeId && (
                  <div className="bg-white rounded border" style={{borderColor: '#E5E7EB'}}>
                    <div className="p-4 border-b flex items-center justify-between" style={{borderColor: '#E5E7EB'}}>
                      <div>
                        <h3 className="font-bold text-gray-900">Pending Member Approvals</h3>
                        <p className="text-sm text-gray-600 mt-1">Review and approve new team members</p>
                      </div>
                      <button
                        onClick={fetchPendingMembers}
                        className="px-3 py-1.5 text-xs font-semibold rounded border hover:bg-gray-50"
                        style={{borderColor: '#E5E7EB', color: '#374151'}}
                        disabled={pendingLoading}
                      >
                        {pendingLoading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    <div className="divide-y" style={{borderColor: '#E5E7EB'}}>
                      {pendingLoading ? (
                        <div className="p-4 text-sm text-gray-600">Loading pending members...</div>
                      ) : pendingMembers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No pending members right now.</div>
                      ) : (
                        pendingMembers.map((member) => (
                          <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(member.id)}
                                className="px-4 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition"
                                style={{backgroundColor: '#16A34A'}}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(member.id)}
                                className="px-4 py-2 text-sm font-semibold rounded text-white hover:opacity-90 transition"
                                style={{backgroundColor: '#DC2626'}}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded border-2" style={{borderColor: '#E5E7EB', borderStyle: (canUpload) ? 'dashed' : 'solid'}}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900">Upload Assignment</h3>
                      {!canUpload && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {!isAdminOwner && !isGroupMatch ? 'Not Your Team' : 'Pending Approval'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-6">All file types accepted (max 50MB)</p>

                    {!canUpload ? (
                      <div className="p-4 rounded border-l-4" style={{backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}}>
                        <p className="text-sm text-yellow-800 font-medium">
                          {!isAdminOwner && isMember && !currentUser.isApproved 
                            ? "Your account is pending approval from your team leader. You'll be able to upload files once approved."
                            : "You can only upload files to your own team. Switch to your team to upload."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-1.5">Assignment Title</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter assignment title..."
                            className="w-full px-3.5 py-2 border-2 rounded text-gray-900 placeholder-gray-400 focus:outline-none transition"
                            style={{borderColor: '#E5E7EB'}}
                            onFocus={(e) => e.target.style.borderColor = '#831717'}
                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                          />
                        </div>

                        <div className="flex gap-4">
                          <label className="flex-1">
                            <input
                              type="file"
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <span className="block px-3.5 py-2 rounded border-2 text-center text-sm font-semibold cursor-pointer transition" style={{borderColor: '#E5E7EB', color: '#831717'}}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>
                              {file ? `✓ ${file.name}` : 'Choose file'}
                            </span>
                          </label>
                          <button
                            onClick={handleUpload}
                            className="px-6 py-2 rounded font-semibold text-white transition"
                            style={{backgroundColor: '#831717'}}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#6B1214'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#831717'}
                          >
                            Upload
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded border overflow-hidden" style={{borderColor: '#E5E7EB'}}>
                  <div className="p-4 border-b font-bold text-gray-900" style={{borderColor: '#E5E7EB'}}>
                    Submissions
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b" style={{borderColor: '#E5E7EB', backgroundColor: '#F9FAFB'}}>
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-900 w-12">No.</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-900">Title</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-900">Date</th>
                          <th className="px-4 py-2 text-center font-semibold text-gray-900 w-40">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{borderColor: '#E5E7EB'}}>
                        {rows.length > 0 ? (
                          rows.map((r) => (
                            <tr key={r.no} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-2 text-gray-700">{r.no}.</td>
                              <td className="px-4 py-2 text-gray-900 font-medium">{r.title}</td>
                              <td className="px-4 py-2 text-right text-gray-600">{r.date}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleView(r.id)}
                                    disabled={!canViewDownload}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      color: (!canViewDownload) ? '#9CA3AF' : '#831717', 
                                      border: `1px solid ${(!canViewDownload) ? '#D1D5DB' : '#831717'}`
                                    }}
                                    onMouseOver={(e) => {
                                      if (canViewDownload) {
                                        e.currentTarget.style.backgroundColor = '#831717';
                                        e.currentTarget.style.color = 'white';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (canViewDownload) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#831717';
                                      }
                                    }}
                                    title={
                                      (isAdminOwner) ? "View file" :
                                      !isGroupMatch ? "You can only view files in your own team" :
                                      "View file"
                                    }
                                  >
                                    <FiEye size={14} />
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDownload(r.id, r.title)}
                                    disabled={!canViewDownload}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                      color: (!canViewDownload) ? '#9CA3AF' : '#831717',
                                      border: `1px solid ${(!canViewDownload) ? '#D1D5DB' : '#831717'}`
                                    }}
                                    onMouseOver={(e) => {
                                      if (canViewDownload) {
                                        e.currentTarget.style.backgroundColor = '#831717';
                                        e.currentTarget.style.color = 'white';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (canViewDownload) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#831717';
                                      }
                                    }}
                                    title={
                                      (isAdminOwner) ? "Download file" :
                                      !isGroupMatch ? "You can only download files from your own team" :
                                      "Download file"
                                    }
                                  >
                                    <FiDownload size={14} />
                                    Download
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEditClick(r)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition"
                                      style={{
                                        color: '#0F766E',
                                        border: '1px solid #0F766E'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#0F766E';
                                        e.currentTarget.style.color = 'white';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#0F766E';
                                      }}
                                      title="Edit title"
                                    >
                                      <FiEdit2 size={14} />
                                      Edit
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDelete(r.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition"
                                      style={{
                                        color: '#DC2626',
                                        border: '1px solid #DC2626'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#DC2626';
                                        e.currentTarget.style.color = 'white';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#DC2626';
                                      }}
                                      title="Delete submission"
                                    >
                                      <FiTrash2 size={14} />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              No submissions yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t text-sm font-semibold text-gray-700" style={{borderColor: '#E5E7EB'}}>
                    Total: {rows.length}
                  </div>
                </div>
              </div>
            )}

            {showEditModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Edit Submission</h3>
                  <p className="text-sm text-gray-600 mb-4">Update the submission title.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1.5">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3.5 py-2 border-2 rounded text-gray-900 placeholder-gray-400 focus:outline-none transition"
                        style={{borderColor: '#E5E7EB'}}
                        onFocus={(e) => e.target.style.borderColor = '#831717'}
                        onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1.5">Replace file (optional)</label>
                      <label className="flex items-center gap-3 w-full">
                        <input
                          type="file"
                          onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <span
                          className="flex-1 px-3.5 py-2 rounded border-2 text-sm font-semibold cursor-pointer transition"
                          style={{borderColor: '#E5E7EB', color: '#831717'}}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          {editFile ? `✓ ${editFile.name}` : 'Choose file'}
                        </span>
                        {editFile && (
                          <button
                            type="button"
                            onClick={() => setEditFile(null)}
                            className="px-3 py-2 text-xs font-semibold rounded border transition"
                            style={{borderColor: '#E5E7EB', color: '#6B7280'}}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            Clear
                          </button>
                        )}
                      </label>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingSubmission(null);
                          setEditFile(null);
                        }}
                        className="px-4 py-2 border-2 rounded font-semibold transition"
                        style={{borderColor: '#E5E7EB', color: '#374151'}}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="px-4 py-2 rounded font-semibold text-white transition"
                        style={{backgroundColor: '#831717'}}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#6B1214'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#831717'}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

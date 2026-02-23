import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiUpload, FiMenu, FiLogOut, FiDownload, FiEye } from "react-icons/fi";

export default function Group_page() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('accessToken');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeId),
    [groups, activeId]
  );

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
        setActiveId(data[0]?.id ?? '');
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

  useEffect(() => {
    const fetchPendingMembers = async () => {
      if (!token || currentUser.role !== 'leader') {
        return;
      }
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
      }
    };

    fetchPendingMembers();
  }, [token, currentUser.role]);

  const handleUpload = async () => {
    if (!file || !activeId || !title) {
      setError('Please choose a file and add a title.');
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
        throw new Error('Upload failed');
      }
      const data = await response.json();
      setSubmissions((prev) => [data, ...prev]);
      setFile(null);
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    navigate('/');
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
        throw new Error('Failed to view file');
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
        throw new Error('Download failed');
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
        throw new Error('Failed to approve user');
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
        throw new Error('Failed to reject user');
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
      </header>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 max-w-7xl mx-auto">
          {/* Sidebar - Groups */}
          <aside className="h-fit">
            <div className="bg-white rounded border" style={{borderColor: '#E5E7EB'}}>
              <div className="p-4 border-b" style={{borderColor: '#E5E7EB'}}>
                <h2 className="font-bold text-gray-900">Teams</h2>
              </div>
              <div className="p-4 space-y-2">
                {groups.map((g) => {
                  const active = g.id === activeId;
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
                      <div className="font-semibold">{g.name}</div>
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

                {/* Pending Members Approval (Leaders Only) */}
                {currentUser.role === 'leader' && pendingMembers.length > 0 && (
                  <div className="bg-white rounded border" style={{borderColor: '#E5E7EB'}}>
                    <div className="p-4 border-b" style={{borderColor: '#E5E7EB'}}>
                      <h3 className="font-bold text-gray-900">Pending Member Approvals</h3>
                      <p className="text-sm text-gray-600 mt-1">Review and approve new team members</p>
                    </div>
                    <div className="divide-y" style={{borderColor: '#E5E7EB'}}>
                      {pendingMembers.map((member) => (
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
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded border-2" style={{borderColor: '#E5E7EB', borderStyle: currentUser.isApproved ? 'dashed' : 'solid'}}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900">Upload Assignment</h3>
                      {!currentUser.isApproved && currentUser.role !== 'admin' && currentUser.role !== 'owner' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-6">All file types accepted (max 50MB)</p>

                    {!currentUser.isApproved && currentUser.role !== 'admin' && currentUser.role !== 'owner' ? (
                      <div className="p-4 rounded border-l-4" style={{backgroundColor: '#FEF3C7', borderColor: '#F59E0B'}}>
                        <p className="text-sm text-yellow-800 font-medium">
                          Your account is pending approval from your team leader. You'll be able to upload files once approved.
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
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition"
                                    style={{color: '#831717', border: '1px solid #831717'}}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#831717';
                                      e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#831717';
                                    }}
                                    title="View file"
                                  >
                                    <FiEye size={14} />
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleDownload(r.id, r.title)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm font-semibold transition"
                                    style={{color: '#831717', border: '1px solid #831717'}}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#831717';
                                      e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#831717';
                                    }}
                                    title="Download file"
                                  >
                                    <FiDownload size={14} />
                                    Download
                                  </button>
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
          </main>
        </div>
      </div>
    </div>
  )
}

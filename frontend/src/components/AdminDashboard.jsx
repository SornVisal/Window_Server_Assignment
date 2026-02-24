import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionManager } from '../utils/sessionManager';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [leaderTeamSelections, setLeaderTeamSelections] = useState({});
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

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      navigate('/group');
      return;
    }
    setCurrentUserRole(user.role);
    setCurrentUserId(user.id);
    fetchData();
  }, [navigate]);

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

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [usersRes, groupsRes] = await Promise.all([
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!usersRes.ok || !groupsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const groupsData = await groupsRes.json();
      
      setUsers(usersData);
      setGroups(groupsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole, groupId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole, groupId })
      });

      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'Failed to update role');
        if (errorMessage.includes('Team is full')) {
          throw new Error('Team is full (max 10 members). Choose another team.');
        }
        throw new Error(errorMessage);
      }

      // Refresh users list
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };


  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'No Team';
  };

  const getGroupMemberLabel = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return null;
    }
    return {
      label: `Members: ${group.memberCount ?? 0}/${maxTeamMembers}`,
      tone: getMemberTone(group.memberCount ?? 0),
    };
  };

  const getLeaderTargetGroupId = (user) => {
    return leaderTeamSelections[user.id] ?? user.groupId ?? '';
  };

  const handleLogout = () => {
    sessionManager.clearSession();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <img 
            src="https://smis.cs.fs.rupp.edu.kh/rupp_logo.png" 
            alt="RUPP Logo" 
            className="h-16 w-16 mx-auto mb-4 animate-pulse"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="https://smis.cs.fs.rupp.edu.kh/rupp_logo.png" 
                alt="RUPP Logo" 
                className="h-10 w-10 object-contain"
              />
              <div className="ml-4">
                <h1 className="text-lg font-bold" style={{color: '#831717'}}>
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-600">User Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/group')}
                className="px-4 py-2 text-sm font-medium text-white rounded hover:opacity-90"
                style={{backgroundColor: '#831717'}}
              >
                Back to Teams
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium border-2 rounded hover:bg-gray-50"
                style={{borderColor: '#831717', color: '#831717'}}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded border-l-4 bg-red-50" style={{borderColor: '#831717'}}>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              All Users ({users.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage user roles and team assignments
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getGroupName(user.groupId)}</div>
                      {(() => {
                        const info = getGroupMemberLabel(user.groupId);
                        if (!info) {
                          return null;
                        }
                        return (
                          <div className="text-xs" style={{color: info.tone.text}}>
                            {info.label}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isApproved ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'owner' ? 'bg-red-100 text-red-800' :
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'leader' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.role !== 'owner' && user.id !== currentUserId && (
                        <div className="flex space-x-2">
                          {user.role === 'member' && (currentUserRole === 'admin' || currentUserRole === 'owner') && (
                            <select
                              value={getLeaderTargetGroupId(user)}
                              onChange={(event) =>
                                setLeaderTeamSelections((prev) => ({
                                  ...prev,
                                  [user.id]: event.target.value,
                                }))
                              }
                              className="border px-2 py-1 rounded text-xs text-gray-700 bg-white"
                              style={{borderColor: '#E5E7EB'}}
                            >
                              <option value="">Select team</option>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name} ({group.memberCount ?? 0}/{maxTeamMembers})
                                  {(group.memberCount ?? 0) >= maxTeamMembers ? ' - Full' : ''}
                                </option>
                              ))}
                            </select>
                          )}
                          {/* Owner can manage admins and leaders */}
                          {currentUserRole === 'owner' && (
                            <>
                              {user.role === 'member' && (
                                <>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#7C3AED'}}
                                  >
                                    Make Admin
                                  </button>
                                  <button
                                    onClick={() => {
                                      const groupId = getLeaderTargetGroupId(user);
                                      if (!groupId) {
                                        setError('Select a team before assigning leader');
                                        return;
                                      }
                                      handleRoleChange(user.id, 'leader', groupId);
                                    }}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#831717'}}
                                  >
                                    Make Leader
                                  </button>
                                </>
                              )}
                              {user.role === 'leader' && (
                                <>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#7C3AED'}}
                                  >
                                    Promote to Admin
                                  </button>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'member')}
                                    className="border px-3 py-1 rounded text-xs font-medium hover:bg-gray-50"
                                    style={{borderColor: '#831717', color: '#831717'}}
                                  >
                                    Revoke Leader
                                  </button>
                                </>
                              )}
                              {user.role === 'admin' && (
                                <button
                                  onClick={() => handleRoleChange(user.id, 'member')}
                                  className="border px-3 py-1 rounded text-xs font-medium hover:bg-gray-50"
                                  style={{borderColor: '#DC2626', color: '#DC2626'}}
                                >
                                  Revoke Admin
                                </button>
                              )}
                            </>
                          )}
                          
                          {/* Admin can manage admins and leaders */}
                          {currentUserRole === 'admin' && user.role !== 'admin' && (
                            <>
                              {user.role === 'member' && (
                                <>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#7C3AED'}}
                                  >
                                    Make Admin
                                  </button>
                                  <button
                                    onClick={() => {
                                      const groupId = getLeaderTargetGroupId(user);
                                      if (!groupId) {
                                        setError('Select a team before assigning leader');
                                        return;
                                      }
                                      handleRoleChange(user.id, 'leader', groupId);
                                    }}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#831717'}}
                                  >
                                    Make Leader
                                  </button>
                                </>
                              )}
                              {user.role === 'leader' && (
                                <>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    className="text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                                    style={{backgroundColor: '#7C3AED'}}
                                  >
                                    Promote to Admin
                                  </button>
                                  <button
                                    onClick={() => handleRoleChange(user.id, 'member')}
                                    className="border px-3 py-1 rounded text-xs font-medium hover:bg-gray-50"
                                    style={{borderColor: '#831717', color: '#831717'}}
                                  >
                                    Revoke Leader
                                  </button>
                                </>
                              )}
                              {user.role === 'admin' && (
                                <button
                                  onClick={() => handleRoleChange(user.id, 'member')}
                                  className="border px-3 py-1 rounded text-xs font-medium hover:bg-gray-50"
                                  style={{borderColor: '#DC2626', color: '#DC2626'}}
                                >
                                  Revoke Admin
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {user.id === currentUserId && (
                        <span className="text-xs text-gray-500 italic">Current User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

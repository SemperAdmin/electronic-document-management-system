import React, { useState } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { SectionMember } from '../types/hqmc'

interface User {
  id: string
  email: string
  role: string
}

interface UserAssignmentProps {
  availableUsers: User[]
  assignedUsers: (User & { member_role: string })[]
  onAssignUser: (userId: string, role: 'member' | 'manager' | 'admin') => void
  onRemoveUser: (userId: string) => void
}

const UserAssignment: React.FC<UserAssignmentProps> = ({
  availableUsers,
  assignedUsers,
  onAssignUser,
  onRemoveUser
}) => {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'member' | 'manager' | 'admin'>('member')

  const handleAssign = () => {
    if (selectedUserId) {
      onAssignUser(selectedUserId, selectedRole)
      setSelectedUserId('')
      setSelectedRole('member')
    }
  }

  const unassignedUsers = availableUsers.filter(
    user => !assignedUsers.some(assigned => assigned.id === user.id)
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Available Users */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Users</h3>
        
        <div className="space-y-3 mb-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a user</option>
            {unassignedUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as 'member' | 'manager' | 'admin')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          
          <button
            onClick={handleAssign}
            disabled={!selectedUserId}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign User</span>
          </button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {unassignedUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No unassigned users available</p>
          ) : (
            unassignedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{user.role}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assigned Users */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Users</h3>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {assignedUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No users assigned to this section</p>
          ) : (
            assignedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="text-sm font-medium">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    Role: <span className="font-medium capitalize">{user.member_role}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveUser(user.id)}
                  className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Remove user from section"
                >
                  <UserMinus className="w-4 h-4" />
                  <span className="text-xs">Remove</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default UserAssignment
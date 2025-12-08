import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Settings, Users, Shield } from 'lucide-react'
import UserAssignment from '../components/UserAssignment'
import { supabase } from '../lib/supabase'
import { useHQMCStore } from '../stores/hqmcStore'
import { HQMCSection, SectionMember } from '../types/hqmc'

interface User {
  id: string
  email: string
  role: string
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate()
  const { sections, setSections } = useHQMCStore()
  const [users, setUsers] = useState<User[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [sectionMembers, setSectionMembers] = useState<SectionMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionType, setNewSectionType] = useState<'MM' | 'MP' | 'FM'>('MM')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch sections
      const { data: sectionsData } = await supabase
        .from('hqmc_sections')
        .select('*')
      
      if (sectionsData) {
        setSections(sectionsData as HQMCSection[])
      }

      // Fetch all users (limited to first 100 for demo)
      const { data: usersData } = await supabase
        .from('auth.users')
        .select('id, email')
        .limit(100)

      if (usersData) {
        setUsers(usersData.map(user => ({ ...user, role: 'user' })))
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSectionMembers = async (sectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('section_members')
        .select('*')
        .eq('section_id', sectionId)

      if (error) throw error
      if (data) {
        setSectionMembers(data as SectionMember[])
      }
    } catch (error) {
      console.error('Error fetching section members:', error)
    }
  }

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      alert('Please enter a section name')
      return
    }

    try {
      const { data, error } = await supabase
        .from('hqmc_sections')
        .insert({
          name: newSectionName,
          type: newSectionType,
          config: {}
        })
        .select()

      if (error) throw error
      if (data) {
        setSections([...sections, data[0] as HQMCSection])
        setNewSectionName('')
        alert('Section created successfully!')
      }
    } catch (error) {
      console.error('Error creating section:', error)
      alert('Failed to create section')
    }
  }

  const handleAssignUser = async (userId: string, role: 'member' | 'manager' | 'admin') => {
    if (!selectedSection) return

    try {
      const { error } = await supabase
        .from('section_members')
        .insert({
          user_id: userId,
          section_id: selectedSection,
          role
        })

      if (error) throw error
      fetchSectionMembers(selectedSection)
    } catch (error) {
      console.error('Error assigning user:', error)
      alert('Failed to assign user')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedSection) return

    try {
      const { error } = await supabase
        .from('section_members')
        .delete()
        .eq('user_id', userId)
        .eq('section_id', selectedSection)

      if (error) throw error
      fetchSectionMembers(selectedSection)
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Failed to remove user')
    }
  }

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId)
    if (sectionId) {
      fetchSectionMembers(sectionId)
    }
  }

  const getAssignedUsersWithDetails = () => {
    return sectionMembers.map(member => {
      const user = users.find(u => u.id === member.user_id)
      return {
        ...user!,
        member_role: member.role
      }
    }).filter(Boolean)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Admin Panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/hqmc-dashboard')}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">HQMC System Administration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Section Management</h2>
          </div>
          
          {/* Create New Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Section Name"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value as 'MM' | 'MP' | 'FM')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MM">MM - Manpower & Reserve Affairs</option>
              <option value="MP">MP - Plans, Policies & Operations</option>
              <option value="FM">FM - Facilities & Services</option>
            </select>
            
            <button
              onClick={handleCreateSection}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              <span>Create Section</span>
            </button>
          </div>

          {/* Existing Sections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Existing Sections</h3>
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sections created yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map(section => (
                  <div key={section.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{section.name}</h4>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {section.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">ID: {section.id}</p>
                    <button
                      onClick={() => handleSectionSelect(section.id)}
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Manage Users
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Assignment */}
        {selectedSection && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">User Assignment</h2>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Managing users for: <span className="font-semibold">
                  {sections.find(s => s.id === selectedSection)?.name}
                </span>
              </p>
            </div>

            <UserAssignment
              availableUsers={users}
              assignedUsers={getAssignedUsersWithDetails()}
              onAssignUser={handleAssignUser}
              onRemoveUser={handleRemoveUser}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminPanel
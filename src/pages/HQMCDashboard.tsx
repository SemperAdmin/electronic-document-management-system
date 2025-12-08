import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Settings, LogOut } from 'lucide-react'
import SectionCard from '../components/SectionCard'
import { supabase } from '../lib/supabase'
import { useHQMCStore } from '../stores/hqmcStore'
import { HQMCSection, SectionRequest } from '../types/hqmc'

const HQMCDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, sections, setSections, setUser, setLoading, isLoading } = useHQMCStore()
  const [sectionStats, setSectionStats] = useState<Record<string, { requests: number; pending: number; recent: number }>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
      }

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('hqmc_sections')
        .select('*')

      if (sectionsError) throw sectionsError
      if (sectionsData) {
        setSections(sectionsData as HQMCSection[])
        
        // Fetch stats for each section
        const stats: Record<string, { requests: number; pending: number; recent: number }> = {}
        
        for (const section of sectionsData) {
          const { data: requestsData } = await supabase
            .from('section_requests')
            .select('*')
            .eq('section_id', section.id)

          const requests = requestsData as SectionRequest[] || []
          const pending = requests.filter(r => r.status === 'pending').length
          const recent = requests.filter(r => {
            const submissionDate = new Date(r.submission_date)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            return submissionDate >= sevenDaysAgo
          }).length

          stats[section.id] = {
            requests: requests.length,
            pending,
            recent
          }
        }
        
        setSectionStats(stats)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSectionClick = (sectionType: 'MM' | 'MP' | 'FM') => {
    navigate(`/hqmc-section/${sectionType}`)
  }

  const handleAdminClick = () => {
    navigate('/hqmc-admin')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading HQMC Dashboard...</p>
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
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HQMC Document Management</h1>
                <p className="text-sm text-gray-600">Headquarters Marine Corps</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleAdminClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Main Sections Overview</h2>
          <p className="text-gray-600">Select a section to view and manage requests</p>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const stats = sectionStats[section.id] || { requests: 0, pending: 0, recent: 0 }
            return (
              <SectionCard
                key={section.id}
                section={section}
                requestCount={stats.requests}
                pendingCount={stats.pending}
                recentActivity={stats.recent}
                onClick={() => handleSectionClick(section.type)}
              />
            )
          })}
        </div>

        {/* Recent Activity Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-8">
              <p>No recent activity to display</p>
              <p className="text-sm mt-2">Activity will appear here as requests are processed</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HQMCDashboard
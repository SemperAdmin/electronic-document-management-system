import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users, FileText, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { HQMCSection, SectionRequest } from '../types'

const HQMCDashboardSimple: React.FC = () => {
  const navigate = useNavigate()
  const [sections, setSections] = useState<HQMCSection[]>([])
  const [sectionStats, setSectionStats] = useState<Record<string, { requests: number; pending: number; recent: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
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

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'MM':
        return <Users className="w-8 h-8 text-red-600" />
      case 'MP':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'FM':
        return <Clock className="w-8 h-8 text-yellow-600" />
      default:
        return <Shield className="w-8 h-8 text-gray-600" />
    }
  }

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'MM':
        return 'border-red-200 bg-red-50 hover:bg-red-100'
      case 'MP':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100'
      case 'FM':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading HQMC Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HQMC Document Management</h1>
            <p className="text-sm text-gray-600">Headquarters Marine Corps - Main Sections</p>
          </div>
        </div>
        <p className="text-gray-600">Select a section to view and manage requests</p>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const stats = sectionStats[section.id] || { requests: 0, pending: 0, recent: 0 }
          return (
            <div
              key={section.id}
              onClick={() => handleSectionClick(section.type)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${getSectionColor(section.type)}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getSectionIcon(section.type)}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
                    <p className="text-sm text-gray-600">{section.type} Section</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.requests}</div>
                  <div className="text-xs text-gray-600">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.recent}</div>
                  <div className="text-xs text-gray-600">Recent Activity</div>
                </div>
              </div>
            </div>
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
    </div>
  )
}

export default HQMCDashboardSimple
import React from 'react'
import { Users, FileText, Clock, AlertCircle } from 'lucide-react'
import { HQMCSection } from '../types/hqmc'

interface SectionCardProps {
  section: HQMCSection
  requestCount: number
  pendingCount: number
  recentActivity: number
  onClick: () => void
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  requestCount,
  pendingCount,
  recentActivity,
  onClick
}) => {
  const getSectionIcon = () => {
    switch (section.type) {
      case 'MM':
        return <Users className="w-8 h-8 text-red-600" />
      case 'MP':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'FM':
        return <Clock className="w-8 h-8 text-yellow-600" />
      default:
        return <AlertCircle className="w-8 h-8 text-gray-600" />
    }
  }

  const getSectionColor = () => {
    switch (section.type) {
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

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${getSectionColor()}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getSectionIcon()}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{section.name}</h3>
            <p className="text-sm text-gray-600">{section.type} Section</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{requestCount}</div>
          <div className="text-xs text-gray-600">Total Requests</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{recentActivity}</div>
          <div className="text-xs text-gray-600">Recent Activity</div>
        </div>
      </div>
    </div>
  )
}

export default SectionCard
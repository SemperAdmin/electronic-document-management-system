import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { HQMCSection, SectionRequest, SectionMember } from '../types/hqmc'

interface HQMCState {
  user: User | null
  sections: HQMCSection[]
  requests: SectionRequest[]
  members: SectionMember[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setSections: (sections: HQMCSection[]) => void
  setRequests: (requests: SectionRequest[]) => void
  setMembers: (members: SectionMember[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed
  getSectionByType: (type: 'MM' | 'MP' | 'FM') => HQMCSection | undefined
  getRequestsBySection: (sectionId: string) => SectionRequest[]
  getMembersBySection: (sectionId: string) => SectionMember[]
}

export const useHQMCStore = create<HQMCState>((set, get) => ({
  user: null,
  sections: [],
  requests: [],
  members: [],
  isLoading: false,
  error: null,
  
  setUser: (user) => set({ user }),
  setSections: (sections) => set({ sections }),
  setRequests: (requests) => set({ requests }),
  setMembers: (members) => set({ members }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  getSectionByType: (type) => {
    const { sections } = get()
    return sections.find(section => section.type === type)
  },
  
  getRequestsBySection: (sectionId) => {
    const { requests } = get()
    return requests.filter(request => request.section_id === sectionId)
  },
  
  getMembersBySection: (sectionId) => {
    const { members } = get()
    return members.filter(member => member.section_id === sectionId)
  },
}))
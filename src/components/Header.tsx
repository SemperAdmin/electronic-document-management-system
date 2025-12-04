import React, { useState } from 'react'
import logoImg from '../assets/images/logo.png'
import { UNITS } from '@/lib/units'

type HeaderProps = {
  currentUser: any
  hasSectionDashboard: boolean
  hasCommandDashboard: boolean
  onManageProfile: () => void
  onLogout: () => void
  onNavigate: (view: string) => void
  isLogin?: boolean
}

export const Header: React.FC<HeaderProps> = ({ currentUser, hasSectionDashboard, hasCommandDashboard, onManageProfile, onLogout, onNavigate, isLogin = false }) => {
  const [dashOpen, setDashOpen] = useState(false)
  return (
    <header className="bg-brand-navy text-brand-cream shadow-sm border-b border-brand-navy/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 py-6">
          {isLogin ? (
            <>
              <div className="w-full">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-brand-cream">Welcome to the Electronic Document Management System</h1>
                  <p className="text-white/80 mt-1">Secure, hierarchical workflow for military document submissions and reviews.</p>
                  <p className="text-white/70 text-sm mt-1">EDMS enforces chain-of-command with role-based access and a linear review state machine from Platoon to Battalion to Commander.</p>
                </div>
              </div>
              <div className="w-full flex items-center justify-center">
                <img src={logoImg} alt="Semper Admin Logo" className="w-full h-full max-h-40 md:max-h-56 object-contain" />
              </div>
            </>
          ) : (
            <>
          <div className="flex items-center gap-4 h-12 md:h-14">
            <img src={logoImg} alt="Semper Admin Logo" className="h-full w-auto rounded object-contain" />
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold leading-tight text-brand-cream">
                <span className="hidden md:inline text-3xl md:text-4xl">Electronic Document Management System</span>
                <span className="md:hidden text-xl">EDMS</span>
                <a className="text-xs md:text-lg font-normal ml-2 md:ml-3 whitespace-nowrap text-red-500" href="https://linktr.ee/semperadmin">by Semper Admin</a>
              </h1>
              <p className="text-sm font-light text-white/70 mt-0.5">Marine Corps Unit Document Management</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:justify-self-end">
            <div className="text-sm text-[var(--muted)]">
              {currentUser ? (
                <div className="relative flex items-center gap-3 group">
                  <div className="text-right">
                    <div className="font-medium text-brand-cream">
                      {currentUser.rank} {currentUser.lastName}{currentUser.lastName ? ',' : ''} {currentUser.firstName}{currentUser.mi ? ` ${currentUser.mi}` : ''}
                    </div>
                    <div className="text-xs text-white/80">{currentUser.service} • {currentUser.role}</div>
                    {(() => {
                      const unitName = (UNITS.find(x => x.uic === (currentUser?.unitUic || ''))?.unitName) || (currentUser?.unit || '')
                      const company = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ((currentUser as any)?.user_company && (currentUser as any).user_company !== 'N/A' ? (currentUser as any).user_company : null)
                      const platoon = ((currentUser as any)?.platoon && (currentUser as any).platoon !== 'N/A') ? (currentUser as any).platoon : (((currentUser as any)?.user_platoon && (currentUser as any).user_platoon !== 'N/A') ? (currentUser as any).user_platoon : null)
                      const parts = [
                        unitName || null,
                        company,
                        platoon
                      ].filter(Boolean)
                      return parts.length ? (
                        <div className="text-xs text-white/70">{parts.join(' • ')}</div>
                      ) : null
                    })()}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-brand-cream text-brand-navy flex items-center justify-center text-xs font-semibold border border-white/30 select-none">
                    {`${(currentUser.lastName || '').charAt(0)}${(currentUser.firstName || '').charAt(0)}`.toUpperCase()}
                  </div>
                  <div className="absolute right-0 top-full mt-2 min-w-40 bg-white text-brand-navy border border-brand-navy/20 rounded-md shadow-lg opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0">
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream" onClick={onManageProfile}>Manage Profile</button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream" aria-label="Logout" onClick={onLogout}>Logout</button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--muted)]">Not signed in</div>
              )}
            </div>
            {!currentUser && (
              <button className="bg-brand-charcoal text-brand-cream px-3 py-2 rounded-lg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold" onClick={() => onNavigate('login')}>Login</button>
            )}
            <div className="relative inline-block">
              <button className="bg-brand-red text-brand-cream px-3 py-2 rounded-lg hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-4" aria-haspopup="menu" aria-expanded={dashOpen} onClick={() => setDashOpen(prev => !prev)}>Dashboards</button>
              <div className={`${dashOpen ? 'block' : 'hidden'} absolute right-0 mt-2 w-60 bg-[var(--surface)] border-2 border-brand-red-2 rounded-lg shadow-lg text-brand-navy`} role="menu" aria-label="Dashboards">
                <div className="px-4 py-2 bg-brand-red text-brand-cream rounded-t-lg text-sm font-medium">Dashboards</div>
                <div role="group" aria-label="My">
                  {currentUser && (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('dashboard'); setDashOpen(false) }}>My Requests</button>
                  )}
                </div>
                <div className="my-2 border-t border-brand-navy/20" />
                <div role="group" aria-label="Administration">
                  {(currentUser?.isUnitAdmin) && (
                    <button className="w-full text-left px-4 py-2 text sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('admin'); setDashOpen(false) }}>Admin</button>
                  )}
                  {currentUser && !!currentUser.isAppAdmin && (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('appadmin'); setDashOpen(false) }}>App Admin</button>
                  )}
                </div>
                <div className="my-2 border-t border-brand-navy/20" />
                <div role="group" aria-label="Dashboards">
                  {(currentUser && hasSectionDashboard) && (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('section'); setDashOpen(false) }}>Battalion Section Dashboard</button>
                  )}
                  {(hasCommandDashboard) && (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('command'); setDashOpen(false) }}>Command Sections Dashboard</button>
                  )}
                  {(String(currentUser?.role || '').includes('REVIEW')) && (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-brand-cream text-brand-navy" role="menuitem" onClick={() => { onNavigate('review'); setDashOpen(false) }}>Review Dashboard</button>
                  )}
                </div>
              </div>
            </div>
            </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

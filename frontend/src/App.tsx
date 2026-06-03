import React, { useMemo, useState } from 'react'
import SellerDashboard from './pages/SellerDashboard'
import BuyerDashboard from './pages/BuyerDashboard'

type Role = 'seller' | 'buyer'

function getInitialRole(): Role {
  const hash = window.location.hash.replace('#/', '').trim()
  if (hash === 'buyer') return 'buyer'
  return 'seller'
}

export default function App() {
  const [role, setRole] = useState<Role>(() => getInitialRole())

  const pageTitle = useMemo(() => {
    return role === 'seller' ? 'Seller Dashboard — AgroNexa LK' : 'Buyer Dashboard — AgroNexa LK'
  }, [role])

  React.useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  React.useEffect(() => {
    const onHashChange = () => {
      const next = getInitialRole()
      setRole(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  React.useEffect(() => {
    // Keep hash in sync with state (in case user toggles via UI)
    const desired = role === 'seller' ? '#/seller' : '#/buyer'
    if (window.location.hash !== desired) window.location.hash = desired
  }, [role])

  return (
    <div className="h-full">
      {role === 'seller' ? <SellerDashboard onSwitchRole={() => setRole('buyer')} /> : <BuyerDashboard onSwitchRole={() => setRole('seller')} />}

      {/* Lightweight role switcher for demo purposes */}
      <div className="fixed bottom-4 right-4 z-50 hidden sm:block">
        <button
          type="button"
          className="rounded-full bg-white/70 dark:bg-white/5 backdrop-blur-18 border border-black/5 dark:border-white/10 px-4 py-2 text-xs font-semibold text-ink shadow-soft hover:shadow-lg transition-all duration-200"
          onClick={() => setRole((r) => (r === 'seller' ? 'buyer' : 'seller'))}
          aria-label="Switch dashboard role"
        >
          Switch to {role === 'seller' ? 'Buyer' : 'Seller'}
        </button>
      </div>
    </div>
  )
}


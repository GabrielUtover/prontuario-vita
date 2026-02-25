import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import './AppLayout.css'

const STORAGE_KEY = 'app-sidebar-minimized'

export function AppLayout() {
  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(minimized))
    } catch {
      // ignore
    }
  }, [minimized])

  return (
    <div className={`app-layout ${minimized ? 'app-layout-sidebar-minimized' : ''}`}>
      <AppSidebar minimized={minimized} onToggleMinimize={() => setMinimized((v) => !v)} />
      <main className="app-layout-main">
        <Outlet />
      </main>
    </div>
  )
}

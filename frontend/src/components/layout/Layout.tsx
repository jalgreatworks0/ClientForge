import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import AlbedoChat from '../AlbedoChat'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  // Extract current page from pathname (e.g., '/contacts' -> 'contacts')
  const currentPage = location.pathname.split('/')[1] || 'dashboard'

  return (
    <div className="flex flex-col h-screen bg-alabaster-200">
      <Header />
      <main className="flex-1 overflow-y-auto bg-alabaster-200">
        <div className="max-w-[1600px] mx-auto p-8">
          {children}
        </div>
      </main>
      <AlbedoChat currentPage={currentPage} />
    </div>
  )
}

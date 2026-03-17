import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
  hideNav?: boolean
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {!hideNav && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

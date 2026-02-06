import { Sidebar } from '@/components/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <Sidebar />
      <div className="lg:pl-60">
        <main className="px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-8">{children}</main>
      </div>
    </div>
  )
}

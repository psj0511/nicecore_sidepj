import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">{children}</main>
      <Footer />
    </div>
  )
}

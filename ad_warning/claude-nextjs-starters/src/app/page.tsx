import { Container } from '@/components/layout/container'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <Container>
          <h1 className="text-2xl font-bold">대시보드</h1>
        </Container>
      </main>
      <Footer />
    </div>
  )
}

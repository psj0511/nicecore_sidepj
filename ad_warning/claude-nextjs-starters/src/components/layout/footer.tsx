import { Container } from './container'

export function Footer() {
  return (
    <footer className="border-t">
      <Container>
        <div className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              광고 성과 이상 감지 및 운영 이슈 자동화 시스템
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}

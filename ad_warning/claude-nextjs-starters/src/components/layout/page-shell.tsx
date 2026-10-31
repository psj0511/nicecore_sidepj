import { Container } from './container'

interface PageShellProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <Container className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {children}
    </Container>
  )
}

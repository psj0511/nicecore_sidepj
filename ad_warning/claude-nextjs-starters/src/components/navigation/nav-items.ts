export interface NavItem {
  title: string
  href: string
}

export const navItems: NavItem[] = [
  { title: '대시보드', href: '/' },
  { title: '이슈', href: '/issues' },
  { title: '데이터 연결 상태', href: '/sources' },
  { title: '감지 규칙 관리', href: '/rules' },
  { title: 'Notion 연동 설정', href: '/settings/notion' },
]

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

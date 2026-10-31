export interface NavItem {
  title: string
  href: string
}

export const navItems: NavItem[] = [
  { title: '대시보드', href: '/' },
  { title: '데이터 수집 관리', href: '/sync' },
  { title: '감지 규칙 관리', href: '/rules' },
  { title: '이슈', href: '/issues' },
  { title: 'Notion 연동 설정', href: '/settings/notion' },
]

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

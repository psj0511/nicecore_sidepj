export const formatNumber = (v: number) => v.toLocaleString('ko-KR')
export const formatKRW = (v: number) => `${formatNumber(Math.round(v))}원`
export const formatRoas = (v: number) => `${(v * 100).toFixed(0)}%`
export const formatDate = (iso: string) => iso.slice(0, 10)

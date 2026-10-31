import 'server-only'
import {
  APIErrorCode,
  isFullPage,
  isNotionClientError,
  type PageObjectResponse,
} from '@notionhq/client'
import { getNotion } from './client'
import { getStore, type StoreKey } from './store'
import type { Props } from './props'

const norm = (id: string) => id.replace(/-/g, '').toLowerCase()

export const propsOf = (page: PageObjectResponse) =>
  page.properties as unknown as Props

/**
 * 앱 데이터 DB에 속한 페이지만 반환한다. URL·폼에서 온 임의 ID로
 * 같은 워크스페이스의 다른 페이지를 읽거나 수정하지 못하게 막는다.
 */
export async function getStorePage(
  key: StoreKey,
  id: string
): Promise<PageObjectResponse | null> {
  const store = await getStore()
  try {
    const page = await getNotion().pages.retrieve({ page_id: id })
    if (!isFullPage(page) || page.in_trash) return null
    const parent = page.parent
    if (
      parent.type !== 'data_source_id' ||
      norm(parent.data_source_id) !== norm(store[key])
    ) {
      return null
    }
    return page
  } catch (e) {
    if (
      isNotionClientError(e) &&
      (e.code === APIErrorCode.ObjectNotFound ||
        e.code === APIErrorCode.ValidationError)
    ) {
      return null
    }
    throw e
  }
}

export async function trashPage(id: string) {
  await getNotion().pages.update({ page_id: id, in_trash: true })
}

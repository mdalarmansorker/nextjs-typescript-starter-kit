'use server'

import { revalidateTag, updateTag } from 'next/cache'

/**
 * Revalidate a cache tag.
 * @param tag The cache tag to revalidate.
 */
export async function revalidate(tag: string): Promise<void> {
  try {
    await updateTag(tag)
  } catch (error) {
    console.error('Failed to revalidate:', error)
  }
}

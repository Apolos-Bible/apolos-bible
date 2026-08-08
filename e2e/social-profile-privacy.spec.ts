import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('[SOCIAL-PRIVACY-01] shared reading activity', () => {
  test('renders an allowed friend activity and opens the exact passage', async ({ page }) => {
    await installApiMock(page, undefined, {
      profileFriendshipStatus: 'accepted',
      profileLastReading: {
        book_name: 'Juan',
        book_slug: 'juan',
        chapter: 3,
        verse: 16,
        version: 'RVR1960',
        timestamp: '2026-08-08T00:00:00Z',
      },
    })

    await page.goto('/u/21')
    const activity = page.getByRole('link', { name: /Juan 3:16/ })
    await expect(activity).toBeVisible()
    await activity.click()
    await expect(page).toHaveURL(/\/bible\/juan\/3\/16$/)
  })

  test('does not render activity when the API withholds it from a stranger', async ({ page }) => {
    await installApiMock(page, undefined, { profileFriendshipStatus: 'none', profileLastReading: null })

    await page.goto('/u/21')
    await expect(page.getByText(/Recent reading activity|Actividad de lectura reciente/i)).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Juan 3:16/ })).toHaveCount(0)
  })
})

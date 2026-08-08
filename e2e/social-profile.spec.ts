import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('[SOCIAL-PROFILE-01] profile views', () => {
  test('shows private identity and resumable reading activity on the owner profile', async ({ page }) => {
    await installApiMock(page)

    await page.goto('/perfil')
    await expect(page.getByRole('heading', { name: 'Ana Segura' })).toBeVisible()
    await expect(page.getByLabel('Editor group').getByText('ana@example.test')).toBeVisible()
    await expect(page.getByText('Estudio la Biblia con mi comunidad.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Juan 3:16/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible()
  })

  test('shows only public identity and visitor actions on another profile', async ({ page }) => {
    await installApiMock(page)

    await page.goto('/u/21')
    await expect(page.getByRole('heading', { name: 'Lucia Visible' })).toBeVisible()
    await expect(page.getByText('Perfil social visible.')).toBeVisible()
    await expect(page.getByText('lucia.visible@example.test')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add friend' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Block' })).toBeVisible()
  })
})

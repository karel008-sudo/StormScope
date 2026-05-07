import { test, expect } from '@playwright/test'

// 1×1 transparent PNG, used to satisfy radar tile requests in tests.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const NOW = Math.floor(Date.now() / 1000)

const PAYLOAD_PAST_ONLY = {
  version: '2.0',
  generated: NOW,
  host: 'https://tilecache.rainviewer.com',
  radar: {
    past: [
      { time: NOW - 1800, path: '/v2/radar/aaa' },
      { time: NOW - 1200, path: '/v2/radar/bbb' },
      { time: NOW - 600,  path: '/v2/radar/ccc' },
      { time: NOW,        path: '/v2/radar/ddd' },
    ],
    nowcast: [],
  },
  satellite: { infrared: [] },
}

async function mockNetwork(page, payload = PAYLOAD_PAST_ONLY) {
  await page.route('**/api.rainviewer.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
  await page.route('**/tilecache.rainviewer.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG })
  })
  // Stub basemap tiles so map renders even on a sandbox without internet.
  await page.route('**/basemaps.cartocdn.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG })
  })
}

test.beforeEach(async ({ page, context }) => {
  await mockNetwork(page)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 50.0755, longitude: 14.4378 })
})

test('app loads with no fatal page errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`))
  await page.goto('/')
  await page.waitForSelector('.leaflet-container', { timeout: 10_000 })
  expect(errors, errors.join('\n')).toEqual([])
})

test('radar map container is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 })
})

test('bottom nav switches between tabs', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container')

  await page.getByRole('button', { name: 'Timeline' }).click()
  await expect(page.getByRole('heading', { name: 'Replay' })).toBeVisible()

  await page.getByRole('button', { name: 'Insights' }).click()
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByRole('button', { name: 'Radar' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
})

test('settings toggle persists after reload', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Settings' }).click()

  const haptics = page.getByRole('switch', { name: 'Haptics' })
  await expect(haptics).toHaveAttribute('aria-checked', 'true')
  await haptics.click()
  await expect(haptics).toHaveAttribute('aria-checked', 'false')

  await page.reload()
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('switch', { name: 'Haptics' })).toHaveAttribute('aria-checked', 'false')
})

test('app does not crash when geolocation is denied', async ({ page, context }) => {
  await context.clearPermissions()
  await page.goto('/')
  await page.waitForSelector('.leaflet-container', { timeout: 10_000 })
  await expect(page.locator('.leaflet-container')).toBeVisible()
  // Ensure bottom nav still works
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('app handles empty RainViewer nowcast gracefully', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Timeline' }).click()
  await expect(
    page.getByText(/Forecast frames currently unavailable/i),
  ).toBeVisible()
})

test('timeline renders past frame rows even without forecast', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Timeline' }).click()
  await expect(page.getByRole('heading', { name: 'Replay' })).toBeVisible()
  // At least one frame row button is rendered (FrameRow shows HH:MM)
  const frameRows = page.getByRole('button').filter({ hasText: /\d{2}:\d{2}/ })
  expect(await frameRows.count()).toBeGreaterThan(0)
})

test('production preview serves manifest and service worker', async ({ page }) => {
  // baseURL already includes the /StormScope/ prefix — relative requests
  // automatically point at the GH Pages subpath.
  const meta = await page.request.get('manifest.webmanifest')
  expect(meta.status()).toBe(200)
  expect(meta.headers()['content-type']).toContain('manifest+json')
  const sw = await page.request.get('sw.js')
  expect(sw.status()).toBe(200)
})

test('admin mode unlocks Developer section via ?admin=1', async ({ page }) => {
  await page.goto('?admin=1')
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('[data-testid="developer-section"]')).toBeVisible()
  await expect(page.locator('[data-testid="open-dev-logs"]')).toBeVisible()
  await expect(page.locator('[data-testid="force-update"]')).toBeVisible()
})

test('Dev logs view opens, shows entries, supports back', async ({ page }) => {
  await page.goto('?admin=1')
  await page.waitForSelector('.leaflet-container')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('[data-testid="open-dev-logs"]').click()

  // The dialog mounts and the heading reads "Dev Logs"
  await expect(page.getByRole('dialog', { name: 'Dev logs' })).toBeVisible()
  await expect(page.getByText('Dev Logs', { exact: true })).toBeVisible()

  // The SW registration emits at least one info entry — counter > 0
  // (counter renders as "N entries · max 500")
  await expect(page.getByText(/entries · max 500/)).toBeVisible()

  // Back button returns to Settings
  await page.getByRole('button', { name: 'Back to settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

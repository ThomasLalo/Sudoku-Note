import { devices, expect, test } from '@playwright/test';

const mobileViewports = [
	{ name: 'compact mobile', width: 360, height: 640 },
	{ name: 'typical mobile', width: 390, height: 844 },
	{ name: 'large mobile', width: 430, height: 932 }
] as const;

async function waitForLayout(page: import('@playwright/test').Page) {
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await expect
		.poll(() =>
			page
				.locator('.app-container')
				.evaluate((app) => (app as HTMLElement).style.getPropertyValue('--grid-size'))
		)
		.not.toBe('300px');
	await expect(page.locator('.app-container')).toHaveClass(/layout-stacked/);
}

for (const viewport of mobileViewports) {
	test(`${viewport.name} layout fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
		await page.setViewportSize({ width: viewport.width, height: viewport.height });
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await waitForLayout(page);

		const gridBounds = await page.locator('.sudoku-grid-container').boundingBox();
		const gridCorner = await page
			.locator('.sudoku-grid-container .isometric-container > .corner-square')
			.first()
			.boundingBox();
		const keypadCorner = await page
			.locator('.right-panel .isometric-container > .corner-square')
			.first()
			.boundingBox();
		const keyBounds = await page.getByRole('button', { name: '7', exact: true }).boundingBox();

		expect(gridBounds).not.toBeNull();
		expect(gridCorner).not.toBeNull();
		expect(keypadCorner).not.toBeNull();
		expect(keyBounds).not.toBeNull();
		if (!gridBounds || !gridCorner || !keypadCorner || !keyBounds) return;

		expect(gridBounds.width).toBeGreaterThanOrEqual(viewport.width * 0.9);
		expect(keyBounds.width).toBeGreaterThanOrEqual(31.5);
		expect(gridCorner.x + gridCorner.width).toBeLessThanOrEqual(viewport.width + 1);
		expect(keypadCorner.x + keypadCorner.width).toBeLessThanOrEqual(viewport.width + 1);
		expect(keypadCorner.y + keypadCorner.height).toBeLessThanOrEqual(viewport.height + 1);
		expect(
			await page.evaluate(() => ({
				horizontal: document.documentElement.scrollWidth > innerWidth,
				vertical: document.documentElement.scrollHeight > innerHeight
			}))
		).toEqual({ horizontal: false, vertical: false });
	});
}

test('uses touch-sized text controls on a coarse-pointer phone', async ({ browser, baseURL }) => {
	const context = await browser.newContext({ ...devices['iPhone 13'], baseURL });
	const page = await context.newPage();

	try {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await waitForLayout(page);

		const themeSwitch = await page.locator('header .text-switch').boundingBox();
		const panelTabs = await page.locator('.layout-button-container .radio-container').all();
		expect(themeSwitch).not.toBeNull();
		expect(themeSwitch?.height).toBeGreaterThanOrEqual(43.5);
		expect(panelTabs).toHaveLength(2);
		for (const tab of panelTabs) {
			const bounds = await tab.boundingBox();
			expect(bounds).not.toBeNull();
			expect(bounds?.height).toBeGreaterThanOrEqual(43.5);
		}
	} finally {
		await context.close();
	}
});

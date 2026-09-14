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

async function beginSolve(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	await page
		.getByRole('dialog', { name: 'Start solving?' })
		.getByRole('button', { name: 'Start solving', exact: true })
		.click();
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

test('scrolls overflowing Info content within the stacked panel', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForLayout(page);
	await beginSolve(page);
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Controls', exact: true }).click();

	const infoPanel = page.locator('.left-panel');
	const infoContent = page.locator('.info-content');
	const panelBounds = await infoPanel.boundingBox();
	expect(panelBounds).not.toBeNull();
	if (!panelBounds) return;

	expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(844 + 1);
	await expect
		.poll(() =>
			infoContent.evaluate((info) => ({
				canScroll: info.scrollHeight > info.clientHeight,
				overflowY: getComputedStyle(info).overflowY
			}))
		)
		.toEqual({ canScroll: true, overflowY: 'auto' });

	await infoContent.evaluate((info) => info.scrollTo({ top: info.scrollHeight }));
	await expect.poll(() => infoContent.evaluate((info) => info.scrollTop)).toBeGreaterThan(0);
	expect(
		await page.evaluate(() => ({
			horizontal: document.documentElement.scrollWidth > innerWidth,
			vertical: document.documentElement.scrollHeight > innerHeight
		}))
	).toEqual({ horizontal: false, vertical: false });
});

test('uses compact controls and a taller Info panel on phones', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForLayout(page);
	await page.getByText('Info', { exact: true }).click();

	const panelBounds = await page.locator('.left-panel').boundingBox();
	const gridBounds = await page.locator('.sudoku-grid-container').boundingBox();
	const panelTabs = await page.locator('.layout-button-container .radio-container').all();
	const typeSizes = await page.evaluate(() => ({
		panelTitle: Number.parseFloat(
			getComputedStyle(document.querySelector<HTMLElement>('.puzzle-phase')!).fontSize
		),
		accordionLabel: Number.parseFloat(
			getComputedStyle(document.querySelector<HTMLElement>('.accordion-trigger')!).fontSize
		),
		body: Number.parseFloat(
			getComputedStyle(document.querySelector<HTMLElement>('.accordion-panel')!).fontSize
		)
	}));

	expect(panelBounds).not.toBeNull();
	expect(gridBounds).not.toBeNull();
	if (!panelBounds || !gridBounds) return;

	expect(panelBounds.height).toBeGreaterThanOrEqual(190);
	expect(gridBounds.width).toBeLessThan(390 * 0.9);
	expect(panelTabs).toHaveLength(2);
	for (const tab of panelTabs) {
		const bounds = await tab.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds?.height).toBeLessThanOrEqual(36.5);
	}
	expect(typeSizes).toEqual({ panelTitle: 24, accordionLabel: 15, body: 14 });
});

test('scrolls overflowing Info content within the side panel', async ({ page }) => {
	await page.setViewportSize({ width: 844, height: 390 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await expect(page.locator('.app-container')).toHaveClass(/layout-side/);
	await beginSolve(page);
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Controls', exact: true }).click();

	const infoContent = page.locator('.info-content');
	const panelBounds = await page.locator('.left-panel').boundingBox();
	expect(panelBounds).not.toBeNull();
	if (!panelBounds) return;

	expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(390 + 1);
	await expect
		.poll(() => infoContent.evaluate((info) => info.scrollHeight > info.clientHeight))
		.toBe(true);
	await infoContent.evaluate((info) => info.scrollTo({ top: info.scrollHeight }));
	await expect.poll(() => infoContent.evaluate((info) => info.scrollTop)).toBeGreaterThan(0);
});

test('keeps the Info panel within a landscape tablet viewport', async ({ page }) => {
	const viewport = { width: 1180, height: 820 };
	await page.setViewportSize(viewport);
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await expect(page.locator('.app-container')).toHaveClass(/layout-side/);
	await page.getByText('Info', { exact: true }).click();

	const panelBounds = await page.locator('.left-panel').boundingBox();
	const panelCornerBounds = await page
		.locator('.left-panel .isometric-container > .corner-square')
		.boundingBox();

	expect(panelBounds).not.toBeNull();
	expect(panelCornerBounds).not.toBeNull();
	if (!panelBounds || !panelCornerBounds) return;

	expect(panelBounds.width).toBeGreaterThan(300);
	expect(panelCornerBounds.x + panelCornerBounds.width).toBeLessThanOrEqual(viewport.width + 1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('wraps long Info controls within a narrow tablet side panel', async ({ page }) => {
	await page.setViewportSize({ width: 1180, height: 1024 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await expect(page.locator('.app-container')).toHaveClass(/layout-side/);
	await beginSolve(page);
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();

	const returnToReveal = page.locator('label').filter({ hasText: 'Return to Reveal after edits' });
	const switchFace = returnToReveal.locator('.button-face');
	const switchCorner = returnToReveal.locator('.button-corner-square');
	const switchBottomEdge = returnToReveal.locator('.button-bottom-parallelogram');
	const settingsPanel = page.locator('#info-settings-panel');
	const [faceBounds, cornerBounds, bottomEdgeBounds, settingsBounds, edgeSizes] = await Promise.all(
		[
			switchFace.boundingBox(),
			switchCorner.boundingBox(),
			switchBottomEdge.boundingBox(),
			settingsPanel.boundingBox(),
			switchFace.evaluate((face) => {
				const rightEdge = face.querySelector<HTMLElement>('.button-right-parallelogram');
				const bottomEdge = face.querySelector<HTMLElement>('.button-bottom-parallelogram');
				return {
					faceWidth: face.getBoundingClientRect().width,
					faceHeight: face.getBoundingClientRect().height,
					bottomEdgeWidth: bottomEdge ? Number.parseFloat(getComputedStyle(bottomEdge).width) : 0,
					rightEdgeHeight: rightEdge ? Number.parseFloat(getComputedStyle(rightEdge).height) : 0
				};
			})
		]
	);

	expect(faceBounds).not.toBeNull();
	expect(cornerBounds).not.toBeNull();
	expect(bottomEdgeBounds).not.toBeNull();
	expect(settingsBounds).not.toBeNull();
	if (!faceBounds || !cornerBounds || !bottomEdgeBounds || !settingsBounds) return;

	expect(faceBounds.height).toBeGreaterThan(24);
	expect(edgeSizes.bottomEdgeWidth).toBeCloseTo(edgeSizes.faceWidth, 0);
	expect(edgeSizes.rightEdgeHeight).toBeCloseTo(edgeSizes.faceHeight, 0);
	expect(cornerBounds.x + cornerBounds.width).toBeLessThanOrEqual(
		settingsBounds.x + settingsBounds.width
	);
	expect(bottomEdgeBounds.x + bottomEdgeBounds.width).toBeLessThanOrEqual(
		settingsBounds.x + settingsBounds.width
	);
});

test('keeps settings switches touch-sized on a coarse-pointer phone', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ ...devices['iPhone 13'], baseURL });
	const page = await context.newPage();

	try {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await waitForLayout(page);
		await page.getByText('Info', { exact: true }).click();
		await page.getByRole('button', { name: 'Settings', exact: true }).click();

		const themeSwitch = await page.locator('label').filter({ hasText: 'Dark Mode' }).boundingBox();
		expect(themeSwitch).not.toBeNull();
		expect(themeSwitch?.height).toBeGreaterThanOrEqual(43.5);
	} finally {
		await context.close();
	}
});

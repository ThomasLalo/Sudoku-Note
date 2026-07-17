import { expect, test } from '@playwright/test';

async function waitForGridHydration(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => {
		const cell = document.querySelector('.sudoku-cell') as (HTMLElement & { __mousedown?: unknown }) | null;
		return Array.isArray(cell?.__mousedown);
	});
}

test('renders and selects cells in the layered Sudoku grid', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });

	const grid = page.locator('.sudoku-grid');
	await expect(grid).toBeVisible();
	await expect(grid.locator('.sudoku-cell')).toHaveCount(81);
	await expect(grid.locator('.variant-layer')).toHaveCount(1);
	await expect(grid.locator('.selection-layer')).toHaveCount(1);
	await expect(grid.locator('.grid-line-layer')).toHaveCount(1);
	await waitForGridHydration(page);

	await grid.locator('.sudoku-cell').nth(30).click();
	await expect.poll(() => grid.locator('.selection-segment').count()).toBeGreaterThan(0);
});

test('renders a concave selection across box boundaries', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });

	const grid = page.locator('.sudoku-grid');
	const cells = grid.locator('.sudoku-cell');
	const selectedIndexes = [21, 29, 30];
	await waitForGridHydration(page);

	await cells.nth(selectedIndexes[0]).click();
	await expect(grid.locator('.cell-background.selected')).toHaveCount(1);

	for (const [offset, cellIndex] of selectedIndexes.slice(1).entries()) {
		await cells.nth(cellIndex).click({ modifiers: ['Shift'] });
		await expect(grid.locator('.cell-background.selected')).toHaveCount(offset + 2);
	}

	await expect(grid.locator('.selection-segment')).toHaveCount(8);
	await expect(grid.locator('.selection-corner')).toHaveCount(1);
	await grid.screenshot({ path: testInfo.outputPath('concave-selection.png') });
});

test('renders equal selection widths on every side of a box', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });

	const grid = page.locator('.sudoku-grid');
	const cells = grid.locator('.sudoku-cell');
	const selectedIndexes = [0, 1, 2, 9, 10, 11, 18, 19, 20];
	await waitForGridHydration(page);

	await cells.nth(selectedIndexes[0]).click();
	for (const index of selectedIndexes.slice(1)) {
		await cells.nth(index).click({ modifiers: ['Shift'] });
	}

	await expect(grid.locator('.cell-background.selected')).toHaveCount(9);
	await expect(grid.locator('.selection-segment')).toHaveCount(12);
	await grid.screenshot({ path: testInfo.outputPath('box-selection.png') });
});

test('captures the isometric border entry corners', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const bounds = await page.locator('.sudoku-grid').boundingBox();
	expect(bounds).not.toBeNull();
	if (!bounds) return;

	const border = page.locator('.isometric-container').first();
	await expect(border.locator('.right-parallelogram')).toHaveCSS('top', '1px');
	await expect(border.locator('.bottom-parallelogram')).toHaveCSS('left', '1px');

	await page.screenshot({
		path: testInfo.outputPath('isometric-top-right.png'),
		clip: { x: bounds.x + bounds.width - 12, y: bounds.y, width: 32, height: 32 }
	});
	await page.screenshot({
		path: testInfo.outputPath('isometric-bottom-left.png'),
		clip: { x: bounds.x, y: bounds.y + bounds.height - 12, width: 32, height: 32 }
	});
	await page.screenshot({
		path: testInfo.outputPath('isometric-bottom-right.png'),
		clip: {
			x: bounds.x + bounds.width - 12,
			y: bounds.y + bounds.height - 12,
			width: 40,
			height: 40
		}
	});
});

test('keeps the isometric correction at the mobile border size', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const border = page.locator('.isometric-container').first();
	await expect(border.locator('.right-parallelogram')).toHaveCSS('top', '1px');
	await expect(border.locator('.bottom-parallelogram')).toHaveCSS('left', '1px');
});

test('uses even spacing above and below the grid on desktop', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const gridBounds = await page.locator('.sudoku-grid').boundingBox();
	const bottomEdgeBounds = await page.locator('.bottom-parallelogram').first().boundingBox();

	expect(gridBounds).not.toBeNull();
	expect(bottomEdgeBounds).not.toBeNull();
	if (!gridBounds || !bottomEdgeBounds) return;

	expect(gridBounds.height).toBeGreaterThan(0.85 * 1080);
	const topSpace = gridBounds.y;
	const bottomSpace = 1080 - (bottomEdgeBounds.y + bottomEdgeBounds.height);
	expect(bottomSpace).toBeCloseTo(topSpace, 0);
});

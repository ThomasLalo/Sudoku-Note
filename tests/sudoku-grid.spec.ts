import { expect, test } from '@playwright/test';

async function waitForGridHydration(page: import('@playwright/test').Page) {
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
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

test('fills every selected cell from the keypad in write mode', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await cells.nth(10).click({ modifiers: ['Shift'] });

	const writeMode = page.locator('.keypad input[type="radio"][value="Enter digit"]');
	await expect(writeMode).toBeChecked();
	await page.getByRole('button', { name: '3', exact: true }).click();

	await expect(cells.nth(0).locator('.value')).toHaveText('3');
	await expect(cells.nth(10).locator('.value')).toHaveText('3');
});

test('reveals matching filled digits and uncrossed candidates from the keypad', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	for (const cellIndex of [0, 40]) {
		await cells.nth(cellIndex).click();
		await page.getByRole('button', { name: '4', exact: true }).click();
	}

	await cells.nth(80).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.getByRole('button', { name: '4', exact: true }).click();
	await page.locator('.keypad label[title="Reveal all candidates"]').click();
	await page.getByRole('button', { name: '4', exact: true }).click();

	const backgrounds = page.locator('.cell-background');
	for (const cellIndex of [0, 40]) {
		await expect(backgrounds.nth(cellIndex)).toHaveClass(/revealed/);
		await expect(cells.nth(cellIndex).locator('.value')).toHaveClass(/value-revealed/);
	}

	const revealedCandidate = cells.nth(70).locator('[data-candidate="4"]');
	await expect(revealedCandidate).toHaveClass(/candidate-revealed/);
	await expect(revealedCandidate.locator('.candidate-text')).toHaveCSS(
		'background-color',
		await page.locator('body').evaluate((body) => {
			const probe = document.createElement('span');
			probe.style.backgroundColor = 'var(--color-primary)';
			body.append(probe);
			const color = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return color;
		})
	);

	const crossedCandidate = cells.nth(80).locator('[data-candidate="4"]');
	await expect(crossedCandidate).toHaveClass(/candidate-crossed-out/);
	await expect(crossedCandidate).not.toHaveClass(/candidate-revealed/);
});

test('reveals a number from the keyboard without requiring a selected cell', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cell = page.locator('.sudoku-cell').first();
	await cell.click();
	await page.getByRole('button', { name: '7', exact: true }).click();
	await page.locator('.keypad label[title="Reveal all candidates"]').click();
	await page.keyboard.press('Escape');
	await page.keyboard.press('7');

	await expect(page.locator('.cell-background').first()).toHaveClass(/revealed/);
	await expect(cell.locator('.value')).toHaveClass(/value-revealed/);
	await expect(page.locator('.cell-background.selected')).toHaveCount(0);
});

test('hides eliminated candidates without shifting the remaining candidates', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	const visiblePeer = cells.nth(1);
	const candidate7 = visiblePeer.locator('[data-candidate="7"]');
	const candidate8 = visiblePeer.locator('[data-candidate="8"]');
	const candidate9 = visiblePeer.locator('[data-candidate="9"]');
	const positionsBefore = await Promise.all([candidate7.boundingBox(), candidate8.boundingBox()]);

	await cells.nth(0).click();
	await page.getByRole('button', { name: '9', exact: true }).click();

	await expect(candidate9).toHaveCSS('visibility', 'hidden');
	await expect(candidate9).toHaveAttribute('aria-hidden', 'true');
	const positionsAfter = await Promise.all([candidate7.boundingBox(), candidate8.boundingBox()]);
	for (const [index, before] of positionsBefore.entries()) {
		expect(before).not.toBeNull();
		expect(positionsAfter[index]).not.toBeNull();
		expect(positionsAfter[index]?.x).toBeCloseTo(before?.x ?? 0, 5);
		expect(positionsAfter[index]?.y).toBeCloseTo(before?.y ?? 0, 5);
	}
});

test('recalculates visible candidates when a filled value is deleted', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.getByRole('button', { name: '9', exact: true }).click();
	await cells.nth(1).click();
	await page.getByRole('button', { name: '9', exact: true }).click();

	const stillBlockedCandidate = cells.nth(9).locator('[data-candidate="9"]');
	const restoredCandidate = cells.nth(27).locator('[data-candidate="9"]');
	await expect(stillBlockedCandidate).toHaveCSS('visibility', 'hidden');
	await expect(restoredCandidate).toHaveCSS('visibility', 'hidden');

	await cells.nth(0).click();
	await page.getByRole('button', { name: 'Delete digit' }).click();

	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
	await expect(stillBlockedCandidate).toHaveCSS('visibility', 'hidden');
	await expect(restoredCandidate).toHaveCSS('visibility', 'visible');
});

test('switches notes and keypad between standard and flipped layouts', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const firstCellCandidates = page.locator('.sudoku-cell').first().locator('[data-candidate]');
	const keypadButtons = page.locator('.keypad button');
	const getKeypadOrder = () =>
		keypadButtons.evaluateAll((buttons) =>
			buttons.slice(0, 9).map((button) => button.getAttribute('aria-label'))
		);
	await expect(firstCellCandidates).toHaveCount(9);
	expect(await firstCellCandidates.evaluateAll((candidates) => candidates.map((candidate) => candidate.getAttribute('data-candidate')))).toEqual([
		'7',
		'8',
		'9',
		'4',
		'5',
		'6',
		'1',
		'2',
		'3'
	]);
	expect(await getKeypadOrder()).toEqual(['7', '8', '9', '4', '5', '6', '1', '2', '3']);

	await page.locator('label').filter({ hasText: 'Flipped notes' }).click();
	expect(await firstCellCandidates.evaluateAll((candidates) => candidates.map((candidate) => candidate.getAttribute('data-candidate')))).toEqual([
		'1',
		'2',
		'3',
		'4',
		'5',
		'6',
		'7',
		'8',
		'9'
	]);
	expect(await getKeypadOrder()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
});

test('crosses out a candidate in every selected cell from the keypad', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await expect(page.getByRole('button', { name: 'Delete digit' })).toBeVisible();
	await expect(page.locator('.keypad input[type="radio"]')).toHaveCount(5);
	await cells.nth(0).click();
	await cells.nth(10).click({ modifiers: ['Shift'] });
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await expect(page.getByLabel('Crossout candidate')).toBeChecked();
	await page.getByRole('button', { name: '4', exact: true }).click();

	for (const cellIndex of [0, 10]) {
		const candidate = cells.nth(cellIndex).locator('[data-candidate="4"]');
		await expect(candidate).toHaveClass(/candidate-crossed-out/);
		const decoration = await candidate.evaluate((element) => {
			const line = getComputedStyle(element, '::after');
			return { content: line.content, borderColor: line.borderTopColor, width: line.width };
		});
		expect(decoration.content).not.toBe('none');
		expect(decoration.borderColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(Number.parseFloat(decoration.width)).toBeGreaterThan(0);
	}
});

test('crosses out candidates from the keyboard without filling selected cells', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cell = page.locator('.sudoku-cell').first();
	await cell.click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.keyboard.press('7');

	await expect(cell.locator('.value')).toHaveCount(0);
	await expect(cell.locator('[data-candidate="7"]')).toHaveClass(/candidate-crossed-out/);
});

test('bolds a candidate in every selected cell from the keypad', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);
	const cells = page.locator('.sudoku-cell');

	await cells.nth(0).click();
	await cells.nth(1).click({ modifiers: ['Shift'] });
	await page.locator('.keypad label[title="Bold candidate"]').click();
	await expect(page.getByLabel('Bold candidate')).toBeChecked();
	await page.getByRole('button', { name: '4' }).click();

	for (const cellIndex of [0, 1]) {
		const candidate = cells.nth(cellIndex).locator('[data-candidate="4"]');
		await expect(candidate).toHaveClass(/candidate-bold/);
		await expect(candidate).toHaveCSS('font-weight', '700');
		expect(
			await candidate.evaluate((element) => {
				const accentColorProbe = document.createElement('span');
				accentColorProbe.style.color = 'var(--color-accent)';
				document.body.append(accentColorProbe);
				const usesAccentColor =
					getComputedStyle(element).color === getComputedStyle(accentColorProbe).color;
				accentColorProbe.remove();
				return usesAccentColor;
			})
		).toBe(true);
	}
});

test('bolds candidates from the keyboard without filling selected cells', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);
	const cell = page.locator('.sudoku-cell').first();

	await cell.click();
	await page.locator('.keypad label[title="Bold candidate"]').click();
	await page.keyboard.press('7');

	await expect(cell.locator('[data-candidate="7"]')).toHaveClass(/candidate-bold/);
	await expect(cell.locator('.value')).toHaveCount(0);
});

test('renders crossed-out bold candidates like regular crossed-out candidates', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.locator('.keypad label[title="Bold candidate"]').click();
	await page.getByRole('button', { name: '2', exact: true }).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.getByRole('button', { name: '2', exact: true }).click();

	await cells.nth(1).click();
	await page.getByRole('button', { name: '2', exact: true }).click();

	const boldCrossout = cells.nth(0).locator('[data-candidate="2"]');
	const regularCrossout = cells.nth(1).locator('[data-candidate="2"]');
	await expect(boldCrossout).toHaveClass(/candidate-bold/);
	await expect(boldCrossout).toHaveClass(/candidate-crossed-out/);

	const styles = await Promise.all(
		[boldCrossout, regularCrossout].map((candidate) =>
			candidate.evaluate((element) => {
				const text = getComputedStyle(element);
				const strike = getComputedStyle(element, '::after');
				return {
					color: text.color,
					fontWeight: text.fontWeight,
					opacity: text.opacity,
					strikeColor: strike.borderTopColor,
					strikeWidth: strike.borderTopWidth
				};
			})
		)
	);
	expect(styles[0]).toEqual(styles[1]);
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
	const bottomEdgeBounds = await page
		.locator('.sudoku-grid-container .bottom-parallelogram')
		.boundingBox();

	expect(gridBounds).not.toBeNull();
	expect(bottomEdgeBounds).not.toBeNull();
	if (!gridBounds || !bottomEdgeBounds) return;

	expect(gridBounds.height).toBeGreaterThan(0.85 * 1080);
	const topSpace = gridBounds.y;
	const bottomSpace = 1080 - (bottomEdgeBounds.y + bottomEdgeBounds.height);
	expect(bottomSpace).toBeCloseTo(topSpace, 0);
});

import { expect, test } from '@playwright/test';

async function waitForGridHydration(page: import('@playwright/test').Page) {
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
	const startSolvingButton = page.getByRole('button', { name: 'Start solving', exact: true });
	if (await startSolvingButton.isVisible()) {
		await startSolvingButton.click();
		const dialog = page.getByRole('dialog', { name: 'Start solving?' });
		await dialog.getByRole('button', { name: 'Start solving', exact: true }).click();
		await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	}
}

test('renders and selects cells in the layered Sudoku grid', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' });

	const grid = page.locator('.sudoku-grid');
	await expect(grid).toBeVisible();
	await expect(grid.locator('.sudoku-cell')).toHaveCount(81);
	await waitForGridHydration(page);

	await grid.locator('.sudoku-cell').nth(30).click();
	await expect.poll(() => grid.locator('.selection-segment').count()).toBeGreaterThan(0);
});

test('selects multiple cells with a touch pointer drag', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const grid = page.locator('.sudoku-grid');
	const cells = page.locator('.sudoku-cell');
	const start = await cells.nth(0).boundingBox();
	const end = await cells.nth(2).boundingBox();
	expect(start).not.toBeNull();
	expect(end).not.toBeNull();

	const pointer = {
		pointerId: 1,
		pointerType: 'touch',
		isPrimary: true,
		button: 0
	};
	await cells.nth(0).dispatchEvent('pointerdown', {
		...pointer,
		clientX: start!.x + start!.width / 2,
		clientY: start!.y + start!.height / 2
	});
	await grid.dispatchEvent('pointermove', {
		...pointer,
		clientX: end!.x + end!.width / 2,
		clientY: end!.y + end!.height / 2
	});
	await grid.dispatchEvent('pointerup', {
		...pointer,
		clientX: end!.x + end!.width / 2,
		clientY: end!.y + end!.height / 2
	});

	await expect(page.locator('.cell-background.selected')).toHaveCount(3);
	await expect(grid).toHaveCSS('touch-action', 'none');
});

test('preserves mouse drag selection with pointer events', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	const start = await cells.nth(0).boundingBox();
	const end = await cells.nth(2).boundingBox();
	expect(start).not.toBeNull();
	expect(end).not.toBeNull();

	await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
	await page.mouse.down();
	await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2);
	await page.mouse.up();

	await expect(page.locator('.cell-background.selected')).toHaveCount(3);
});

test('multi-select toggles cells and keeps each drag add-only or remove-only', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const grid = page.locator('.sudoku-grid');
	const cells = page.locator('.sudoku-cell');
	const multiSelect = page.getByLabel('Multi-select');
	const secondaryKeypad = page.locator('.secondary-keypad');
	const multiSelectButton = secondaryKeypad.locator('label[title="Multi-select"]');

	await expect(secondaryKeypad).toHaveCount(1);
	await expect(multiSelect).not.toBeChecked();
	await multiSelectButton.click();
	await expect(multiSelect).toBeChecked();

	await cells.nth(0).click();
	await cells.nth(10).click();
	await expect(page.locator('.cell-background.selected')).toHaveCount(2);

	await cells.nth(0).click();
	await expect(page.locator('.cell-background.selected')).toHaveCount(1);

	const addStart = await cells.nth(1).boundingBox();
	const addEnd = await cells.nth(3).boundingBox();
	expect(addStart).not.toBeNull();
	expect(addEnd).not.toBeNull();
	await page.mouse.move(addStart!.x + addStart!.width / 2, addStart!.y + addStart!.height / 2);
	await page.mouse.down();
	await page.mouse.move(addEnd!.x + addEnd!.width / 2, addEnd!.y + addEnd!.height / 2);
	await page.mouse.up();
	await expect(page.locator('.cell-background.selected')).toHaveCount(4);

	const removeStart = await cells.nth(1).boundingBox();
	const removeEnd = await cells.nth(3).boundingBox();
	await page.mouse.move(
		removeStart!.x + removeStart!.width / 2,
		removeStart!.y + removeStart!.height / 2
	);
	await page.mouse.down();
	await page.mouse.move(removeEnd!.x + removeEnd!.width / 2, removeEnd!.y + removeEnd!.height / 2);
	await page.mouse.up();
	await expect(page.locator('.cell-background.selected')).toHaveCount(1);

	await page.keyboard.press('ArrowRight');
	await expect(page.locator('.cell-background.selected')).toHaveCount(1);
	await expect(page.locator('.cell-background').nth(10)).not.toHaveClass(/selected/);
	await expect(page.locator('.cell-background').nth(11)).toHaveClass(/selected/);

	await multiSelectButton.click();
	await cells.nth(20).click();
	await expect(page.locator('.cell-background.selected')).toHaveCount(1);
});

test('fills every selected cell from the keypad and returns to reveal', async ({ page }) => {
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
	await expect(page.getByLabel('Reveal all candidates')).toBeChecked();
	await expect(page.locator('.cell-background.selected')).toHaveCount(2);
	await expect(cells.nth(0).locator('.value')).toHaveClass(/value-revealed/);
});

test('keeps edit tools sticky when return to reveal is disabled', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	const returnSetting = page.getByLabel('Return to Reveal after edits');
	await expect(returnSetting).toBeChecked();
	await page.locator('label').filter({ hasText: 'Return to Reveal after edits' }).click();
	await expect(returnSetting).not.toBeChecked();

	await page.locator('.sudoku-cell').first().click();
	await page.getByRole('button', { name: '3', exact: true }).click();
	await expect(page.getByLabel('Enter digit')).toBeChecked();
});

test('does not return to reveal for keyboard number input or keyboard button activation', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('3');
	await expect(page.getByLabel('Enter digit')).toBeChecked();
	await expect(cells.nth(0).locator('.value')).toHaveText('3');

	await cells.nth(1).click();
	const fourButton = page.getByRole('button', { name: '4', exact: true });
	await fourButton.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByLabel('Enter digit')).toBeChecked();
	await expect(cells.nth(1).locator('.value')).toHaveText('4');
});

test('does not return to reveal when a pointer edit has no selected cells', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	await page.getByRole('button', { name: '3', exact: true }).click();
	await expect(page.getByLabel('Enter digit')).toBeChecked();
	await expect(page.locator('.sudoku-cell .value')).toHaveCount(0);
});

test('marks duplicate filled digits that see each other as conflicts', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	const backgrounds = page.locator('.cell-background');
	// Cover row (0 and 4), box (10 and 20), and column (27 and 54) conflicts.
	const conflictingIndexes = [0, 4, 10, 20, 27, 54];

	for (const cellIndex of conflictingIndexes) {
		await cells.nth(cellIndex).click();
		await page.keyboard.press('3');
	}

	for (const cellIndex of conflictingIndexes) {
		await expect(backgrounds.nth(cellIndex)).toHaveClass(/conflict/);
		await expect(cells.nth(cellIndex).locator('.value')).toHaveClass(/value-conflict/);
	}
	await expect(backgrounds.nth(40)).not.toHaveClass(/conflict/);

	const conflictColors = await cells.nth(0).evaluate((cell) => {
		const background = document.querySelector('.cell-background.conflict');
		const value = cell.querySelector('.value-conflict');
		const probe = document.createElement('span');
		probe.style.backgroundColor = 'var(--color-secondary)';
		probe.style.color = 'var(--color-background-lightest)';
		document.body.append(probe);
		const colors = {
			actualBackground: background ? getComputedStyle(background).backgroundColor : '',
			expectedBackground: getComputedStyle(probe).backgroundColor,
			actualText: value ? getComputedStyle(value).color : '',
			expectedText: getComputedStyle(probe).color
		};
		probe.remove();
		return colors;
	});
	expect(conflictColors.actualBackground).toBe(conflictColors.expectedBackground);
	expect(conflictColors.actualText).toBe(conflictColors.expectedText);

	await cells.nth(54).click();
	await page.getByRole('button', { name: 'Delete digit' }).click();
	await expect(backgrounds.nth(54)).not.toHaveClass(/conflict/);
});

test('reveals matching filled digits and uncrossed candidates from the keypad', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	for (const cellIndex of [0, 40]) {
		await cells.nth(cellIndex).click();
		await page.keyboard.press('4');
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
	await expect(backgrounds.nth(70)).toHaveClass(/candidate-revealed/);
	await expect(backgrounds.nth(70)).toHaveCSS(
		'background-color',
		await page.locator('body').evaluate((body) => {
			const probe = document.createElement('span');
			probe.style.backgroundColor = 'var(--color-background-dark)';
			body.append(probe);
			const color = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return color;
		})
	);
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
	await expect(backgrounds.nth(80)).not.toHaveClass(/candidate-revealed/);
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

test('scales filled values with the Sudoku cells on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cell = page.locator('.sudoku-cell').first();
	await cell.click();
	await page.keyboard.press('9');

	const mobileCellBounds = await cell.boundingBox();
	const mobileFontSize = await cell
		.locator('.value')
		.evaluate((value) => Number.parseFloat(getComputedStyle(value).fontSize));

	expect(mobileCellBounds).not.toBeNull();
	expect(mobileFontSize).toBeLessThan((mobileCellBounds?.height ?? 0) * 0.8);

	await page.setViewportSize({ width: 1400, height: 1000 });

	const desktopCellBounds = await cell.boundingBox();
	const desktopFontSize = await cell
		.locator('.value')
		.evaluate((value) => Number.parseFloat(getComputedStyle(value).fontSize));

	expect(desktopCellBounds).not.toBeNull();
	expect(desktopFontSize).toBeGreaterThan(mobileFontSize);
	expect(desktopFontSize / (desktopCellBounds?.height ?? 1)).toBeCloseTo(
		mobileFontSize / (mobileCellBounds?.height ?? 1),
		1
	);
});

test('keeps mobile grid lines consistent and candidates clear of cell borders', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const gridLineWidths = await page.locator('.sudoku-grid').evaluate((grid) => {
		const cellLine = grid.querySelector<SVGElement>('.grid-line:not(.box-line)');
		const boxLine = grid.querySelector<SVGElement>('.grid-line.box-line');
		return {
			cell: cellLine ? Number.parseFloat(getComputedStyle(cellLine).strokeWidth) : 0,
			box: boxLine ? Number.parseFloat(getComputedStyle(boxLine).strokeWidth) : 0
		};
	});
	expect(gridLineWidths.cell).toBeCloseTo(1, 0);
	expect(gridLineWidths.box).toBeCloseTo(3, 0);

	const topCandidateClearances = await page.locator('.sudoku-cell').evaluateAll((cells) =>
		cells.map((cell) => {
			const candidate = cell.querySelector<HTMLElement>('[data-candidate="7"] .candidate-text');
			if (!candidate) return 0;
			return candidate.getBoundingClientRect().top - cell.getBoundingClientRect().top;
		})
	);
	expect(Math.min(...topCandidateClearances)).toBeGreaterThan(2);
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
	await page.keyboard.press('9');
	await cells.nth(1).click();
	await page.keyboard.press('9');

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
	expect(
		await firstCellCandidates.evaluateAll((candidates) =>
			candidates.map((candidate) => candidate.getAttribute('data-candidate'))
		)
	).toEqual(['7', '8', '9', '4', '5', '6', '1', '2', '3']);
	expect(await getKeypadOrder()).toEqual(['7', '8', '9', '4', '5', '6', '1', '2', '3']);

	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await page.locator('label').filter({ hasText: 'Flipped notes' }).click();
	expect(
		await firstCellCandidates.evaluateAll((candidates) =>
			candidates.map((candidate) => candidate.getAttribute('data-candidate'))
		)
	).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
	expect(await getKeypadOrder()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
});

test('uses the six-column keypad layout below the grid', async ({ page }) => {
	await page.setViewportSize({ width: 768, height: 1024 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const position = async (title: string) => {
		const box = await page.locator(`[title="${title}"]`).boundingBox();
		expect(box).not.toBeNull();
		return box!;
	};
	const seven = await position('7');
	const four = await position('4');
	const one = await position('1');
	const deleteDigit = await position('Delete digit');
	const enterDigit = await position('Enter digit');
	const reveal = await position('Reveal all candidates');
	const crossout = await position('Crossout candidate');
	const add = await position('Add candidate');
	const bold = await position('Bold candidate');
	const multiSelect = await position('Multi-select');

	expect(deleteDigit.y).toBeCloseTo(seven.y);
	expect(crossout.y).toBeCloseTo(seven.y);
	expect(enterDigit.y).toBeCloseTo(four.y);
	expect(add.y).toBeCloseTo(four.y);
	expect(reveal.y).toBeCloseTo(one.y);
	expect(bold.y).toBeCloseTo(one.y);
	expect(enterDigit.x).toBeCloseTo(deleteDigit.x);
	expect(reveal.x).toBeCloseTo(deleteDigit.x);
	expect(add.x).toBeCloseTo(crossout.x);
	expect(bold.x).toBeCloseTo(crossout.x);
	expect(multiSelect.y).toBeCloseTo(crossout.y);
	expect(multiSelect.x).toBeGreaterThan(crossout.x);
});

test('preserves keypad breathing room and keeps landscape controls beside the grid', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const seven = await page.getByRole('button', { name: '7', exact: true }).boundingBox();
	const eight = await page.getByRole('button', { name: '8', exact: true }).boundingBox();
	const keypadContent = await page.locator('.keypad-content').boundingBox();
	const buttonEdge = await page
		.getByRole('button', { name: '7', exact: true })
		.locator('.button-right-parallelogram')
		.evaluate((edge) => (edge as HTMLElement).offsetWidth);
	const keypadFaceBorder = await page
		.locator('.keypad-content')
		.evaluate((content) => Number.parseFloat(getComputedStyle(content).borderLeftWidth));
	expect(seven).not.toBeNull();
	expect(eight).not.toBeNull();
	expect(keypadContent).not.toBeNull();
	if (!seven || !eight || !keypadContent) return;

	const visibleKeyGap = eight.x - (seven.x + seven.width) - buttonEdge;
	const visibleKeypadPadding = seven.x - keypadContent.x - keypadFaceBorder;
	expect(visibleKeyGap).toBeCloseTo(buttonEdge, 0);
	expect(visibleKeypadPadding).toBeCloseTo(buttonEdge, 0);

	await page.setViewportSize({ width: 900, height: 800 });
	const grid = await page.locator('.sudoku-grid-container').boundingBox();
	const keypadPanel = await page.locator('.right-panel').boundingBox();
	const gridEdge = await page
		.locator('.sudoku-grid-container .right-parallelogram')
		.evaluate((edge) => (edge as HTMLElement).offsetWidth);
	expect(grid).not.toBeNull();
	expect(keypadPanel).not.toBeNull();
	if (!grid || !keypadPanel) return;

	const visiblePanelGap = keypadPanel.x - (grid.x + grid.width) - gridEdge;
	const sectionGap = await page
		.locator('.app-container')
		.evaluate((app) => Number.parseFloat(getComputedStyle(app).getPropertyValue('--section-gap')));
	expect(visiblePanelGap).toBeCloseTo(sectionGap, 0);
	expect(keypadPanel.y).toBeLessThan(grid.y + grid.height);
	expect(
		await page.evaluate(() => ({
			horizontal: document.documentElement.scrollWidth > innerWidth,
			vertical: document.documentElement.scrollHeight > innerHeight
		}))
	).toEqual({ horizontal: false, vertical: false });

	await page.setViewportSize({ width: 844, height: 390 });
	await expect(page.locator('.app-container')).toHaveClass(/layout-side/);
	const shortGrid = await page.locator('.sudoku-grid-container').boundingBox();
	const shortKey = await page.getByRole('button', { name: '7', exact: true }).boundingBox();
	expect(shortGrid).not.toBeNull();
	expect(shortKey).not.toBeNull();
	if (!shortGrid || !shortKey) return;
	expect(shortGrid.height).toBeLessThan(390);
	expect(shortKey.width).toBeGreaterThanOrEqual(43.5);
});

test('uses side controls near square while preserving the tall portrait stack', async ({
	page
}) => {
	await page.setViewportSize({ width: 662, height: 673 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const nearSquareGrid = await page.locator('.sudoku-grid-container').boundingBox();
	const nearSquareKeypad = await page.locator('.right-panel').boundingBox();
	expect(nearSquareGrid).not.toBeNull();
	expect(nearSquareKeypad).not.toBeNull();
	if (!nearSquareGrid || !nearSquareKeypad) return;

	expect(nearSquareGrid.width).toBeGreaterThan(400);
	expect(nearSquareKeypad.x).toBeGreaterThan(nearSquareGrid.x + nearSquareGrid.width);

	await page.setViewportSize({ width: 675, height: 900 });
	const portraitGrid = await page.locator('.sudoku-grid-container').boundingBox();
	const portraitKeypad = await page.locator('.right-panel').boundingBox();
	expect(portraitGrid).not.toBeNull();
	expect(portraitKeypad).not.toBeNull();
	if (!portraitGrid || !portraitKeypad) return;

	expect(portraitKeypad.y).toBeGreaterThan(portraitGrid.y + portraitGrid.height);
});

test('never shrinks the grid when a fixed-width window gets taller', async ({ page }) => {
	await page.setViewportSize({ width: 500, height: 540 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const observations: { height: number; gridSize: number; keySize: number; mode: string }[] = [];
	for (const height of [540, 550, 560, 570, 580, 590, 600, 620, 650]) {
		await page.setViewportSize({ width: 500, height });
		await page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		);

		const gridBounds = await page.locator('.sudoku-grid-container').boundingBox();
		const keyBounds = await page.getByRole('button', { name: '7', exact: true }).boundingBox();
		const mode = await page
			.locator('.app-container')
			.evaluate((app) => [...app.classList].find((name) => name.startsWith('layout-')) ?? '');
		expect(gridBounds).not.toBeNull();
		expect(keyBounds).not.toBeNull();
		if (!gridBounds || !keyBounds) continue;
		observations.push({ height, gridSize: gridBounds.width, keySize: keyBounds.width, mode });
	}

	for (const [index, observation] of observations.entries()) {
		expect(observation.keySize).toBeGreaterThanOrEqual(31.5);
		if (index === 0) continue;
		expect(observation.gridSize).toBeGreaterThanOrEqual(observations[index - 1].gridSize - 1);
	}
	expect(new Set(observations.map((observation) => observation.mode))).toEqual(
		new Set(['layout-side', 'layout-stacked'])
	);
});

test('never shrinks the grid when a fixed-height window gets wider', async ({ page }) => {
	await page.setViewportSize({ width: 500, height: 900 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	let previousGridSize = 0;
	for (const width of [500, 600, 650, 675, 700, 800, 900, 1200, 1615, 1616, 1920]) {
		await page.setViewportSize({ width, height: 900 });
		await page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		);

		const gridBounds = await page.locator('.sudoku-grid-container').boundingBox();
		expect(gridBounds).not.toBeNull();
		if (!gridBounds) continue;
		expect(gridBounds.width).toBeGreaterThanOrEqual(previousGridSize - 1);
		previousGridSize = gridBounds.width;
	}
});

test('only hides the title when a short viewport is height limited', async ({ page }) => {
	await page.setViewportSize({ width: 662, height: 596 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const title = page.locator('header h1');
	const themeSwitch = page.locator('header .button-container');
	const panelSelector = page.locator('.layout-button-container');
	await expect(title).toBeVisible();

	const themeBounds = await themeSwitch.boundingBox();
	const selectorBounds = await panelSelector.boundingBox();
	expect(themeBounds).not.toBeNull();
	expect(selectorBounds).not.toBeNull();
	if (!themeBounds || !selectorBounds) return;

	const overlaps = !(
		themeBounds.x + themeBounds.width <= selectorBounds.x ||
		selectorBounds.x + selectorBounds.width <= themeBounds.x ||
		themeBounds.y + themeBounds.height <= selectorBounds.y ||
		selectorBounds.y + selectorBounds.height <= themeBounds.y
	);
	expect(overlaps).toBe(false);

	await page.setViewportSize({ width: 900, height: 596 });
	await expect(title).toBeHidden();
});

test('crosses out a candidate in every selected cell from the keypad', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await expect(page.getByRole('button', { name: 'Delete digit' })).toBeVisible();
	await expect(page.locator('.keypad input[type="radio"]')).toHaveCount(5);
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await expect(page.getByLabel('Crossout candidate')).toBeChecked();
	await cells.nth(0).click();
	await cells.nth(10).click({ modifiers: ['Shift'] });
	await expect(page.getByLabel('Crossout candidate')).toBeChecked();
	await page.getByRole('button', { name: '4', exact: true }).click();
	await expect(page.getByLabel('Reveal all candidates')).toBeChecked();
	await expect(page.locator('.cell-background.selected')).toHaveCount(2);
	await expect(cells.nth(1).locator('[data-candidate="4"]')).toHaveClass(/candidate-revealed/);

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

test('crosses out candidates from the keyboard without filling selected cells', async ({
	page
}) => {
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

test('cycles through keypad tools with Space', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const tools = [
		'Enter digit',
		'Reveal all candidates',
		'Crossout candidate',
		'Add candidate',
		'Bold candidate',
		'Enter digit'
	];

	await expect(page.getByLabel(tools[0])).toBeChecked();
	for (const tool of tools.slice(1)) {
		await page.keyboard.press('Space');
		await expect(page.getByLabel(tool)).toBeChecked();
	}
});

test('temporarily uses crossout while Shift is held and keeps Shift multi-selection', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.locator('.keypad label[title="Bold candidate"]').click();

	await page.keyboard.down('Shift');
	await expect(page.getByLabel('Crossout candidate')).toBeChecked();
	await cells.nth(10).click();
	await expect(page.locator('.cell-background.selected')).toHaveCount(2);
	await page.evaluate(() => {
		window.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: '&',
				code: 'Digit7',
				shiftKey: true
			})
		);
	});

	for (const cellIndex of [0, 10]) {
		await expect(cells.nth(cellIndex).locator('[data-candidate="7"]')).toHaveClass(
			/candidate-crossed-out/
		);
	}

	await page.keyboard.up('Shift');
	await expect(page.getByLabel('Bold candidate')).toBeChecked();
	await page.keyboard.press('8');
	for (const cellIndex of [0, 10]) {
		await expect(cells.nth(cellIndex).locator('[data-candidate="8"]')).toHaveClass(
			/candidate-bold/
		);
	}
});

test('temporarily fills digits while Control is held and restores the previous tool', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();

	await page.keyboard.down('Control');
	await expect(page.getByLabel('Enter digit')).toBeChecked();
	await page.keyboard.press('4');
	await expect(cells.nth(0).locator('.value')).toHaveText('4');

	await page.keyboard.up('Control');
	await expect(page.getByLabel('Crossout candidate')).toBeChecked();
	await cells.nth(1).click();
	await page.keyboard.press('5');
	await expect(cells.nth(1).locator('[data-candidate="5"]')).toHaveClass(/candidate-crossed-out/);
	await expect(cells.nth(1).locator('.value')).toHaveCount(0);
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
	await expect(page.getByLabel('Bold candidate')).toBeChecked();

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

test('adds candidates from the keypad and restores their standard appearance', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);
	const cells = page.locator('.sudoku-cell');

	await cells.nth(0).click();
	await page.locator('.keypad label[title="Bold candidate"]').click();
	await page.getByRole('button', { name: '4', exact: true }).click();
	await cells.nth(1).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.getByRole('button', { name: '4', exact: true }).click();

	await cells.nth(0).click();
	await cells.nth(1).click({ modifiers: ['Shift'] });
	await page.locator('.keypad label[title="Add candidate"]').click();
	await page.getByRole('button', { name: '4', exact: true }).click();
	await expect(page.getByLabel('Add candidate')).toBeChecked();

	for (const cellIndex of [0, 1]) {
		const candidate = cells.nth(cellIndex).locator('[data-candidate="4"]');
		await expect(candidate).toBeVisible();
		await expect(candidate).not.toHaveClass(/candidate-bold/);
		await expect(candidate).not.toHaveClass(/candidate-crossed-out/);
		await expect(candidate).not.toHaveClass(/candidate-invalid/);
	}
});

test('adds an eliminated candidate from the keyboard and marks both sides as errors', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);
	const cells = page.locator('.sudoku-cell');

	await cells.nth(0).click();
	await page.getByRole('button', { name: '6', exact: true }).click();
	await cells.nth(1).click();
	const restoredCandidate = cells.nth(1).locator('[data-candidate="6"]');
	await expect(restoredCandidate).toBeHidden();

	await page.locator('.keypad label[title="Add candidate"]').click();
	await page.keyboard.press('6');

	await expect(restoredCandidate).toBeVisible();
	await expect(restoredCandidate).toHaveClass(/candidate-invalid/);
	await expect(page.locator('.cell-background').nth(0)).toHaveClass(/conflict/);
	await expect(cells.nth(0).locator('.value')).toHaveClass(/value-conflict/);

	const colors = await cells.nth(1).evaluate((cell) => {
		const candidateText = cell.querySelector('.candidate-invalid .candidate-text');
		const filledBackground = document.querySelector('.cell-background.conflict');
		const filledValue = document.querySelector('.value-conflict');
		const secondaryProbe = document.createElement('span');
		const lightestProbe = document.createElement('span');
		secondaryProbe.style.backgroundColor = 'var(--color-secondary)';
		lightestProbe.style.color = 'var(--color-background-lightest)';
		document.body.append(secondaryProbe, lightestProbe);
		const result = {
			candidateBackground: candidateText ? getComputedStyle(candidateText).backgroundColor : '',
			candidateText: candidateText ? getComputedStyle(candidateText).color : '',
			filledBackground: filledBackground ? getComputedStyle(filledBackground).backgroundColor : '',
			filledText: filledValue ? getComputedStyle(filledValue).color : '',
			secondary: getComputedStyle(secondaryProbe).backgroundColor,
			lightest: getComputedStyle(lightestProbe).color
		};
		secondaryProbe.remove();
		lightestProbe.remove();
		return result;
	});
	expect(colors.candidateBackground).toBe(colors.secondary);
	expect(colors.filledBackground).toBe(colors.secondary);
	expect(colors.candidateText).toBe(colors.lightest);
	expect(colors.filledText).toBe(colors.lightest);
});

test('renders crossed-out bold candidates like regular crossed-out candidates', async ({
	page
}) => {
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
	await page.locator('.keypad label[title="Crossout candidate"]').click();
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

test('renders a concave selection across box boundaries', async ({ page }) => {
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
});

test('renders equal selection widths on every side of a box', async ({ page }) => {
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
});

test('aligns panel and button isometric edges at the mobile size', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const border = page.locator('.isometric-container').first();
	await expect(border.locator('.right-parallelogram')).toHaveCSS('top', '0px');
	await expect(border.locator('.bottom-parallelogram')).toHaveCSS('left', '0px');

	const buttonGeometry = await page
		.getByRole('button', { name: '7', exact: true })
		.evaluate((button) => {
			const face = button.querySelector<HTMLElement>('.button-face');
			const right = button.querySelector<HTMLElement>('.button-right-parallelogram');
			const corner = button.querySelector<HTMLElement>('.button-corner-square');
			if (!face || !right || !corner) return null;

			return {
				faceHeight: face.offsetHeight,
				rightHeight: right.offsetHeight,
				rightWidth: right.offsetWidth,
				cornerHeight: corner.offsetHeight,
				cornerWidth: corner.offsetWidth
			};
		});

	expect(buttonGeometry).not.toBeNull();
	expect(buttonGeometry?.rightHeight).toBe(buttonGeometry?.faceHeight);
	expect(buttonGeometry?.cornerHeight).toBe(buttonGeometry?.rightWidth);
	expect(buttonGeometry?.cornerWidth).toBe(buttonGeometry?.rightWidth);
});

test('restores deeper isometric edges only when both viewport dimensions have room', async ({
	page
}) => {
	const edgeWidths = () =>
		page.evaluate(() => {
			const panelEdge = document.querySelector<HTMLElement>(
				'.sudoku-grid-container .right-parallelogram'
			);
			const buttonEdge = document.querySelector<HTMLElement>('.button-right-parallelogram');
			return {
				panel: panelEdge ? Number.parseFloat(getComputedStyle(panelEdge).width) : 0,
				button: buttonEdge ? Number.parseFloat(getComputedStyle(buttonEdge).width) : 0
			};
		});

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);
	const compact = await edgeWidths();

	await page.setViewportSize({ width: 1440, height: 900 });
	await page.evaluate(() => new Promise(requestAnimationFrame));
	const roomy = await edgeWidths();

	await page.setViewportSize({ width: 844, height: 390 });
	await page.evaluate(() => new Promise(requestAnimationFrame));
	const short = await edgeWidths();

	expect(compact).toEqual({ panel: 8, button: 5 });
	expect(roomy).toEqual({ panel: 16, button: 8 });
	expect(short).toEqual(compact);
});

test('compensates for the bottom Info button edge without overflowing a roomy panel', async ({
	page
}) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await waitForGridHydration(page);

	const geometry = await page.locator('.info-content').evaluate((info) => {
		const styles = getComputedStyle(info);
		const keypad = document.querySelector<HTMLElement>('.keypad-content');
		const buttonEdgeProbe = document.querySelector<HTMLElement>(
			'.right-panel .button-right-parallelogram'
		);
		const bounds = info.getBoundingClientRect();
		const firstChildBounds = info.firstElementChild?.getBoundingClientRect();
		const paddingLeft = Number.parseFloat(styles.paddingLeft);
		const borderLeft = Number.parseFloat(styles.borderLeftWidth);

		return {
			paddingLeft,
			paddingBottom: Number.parseFloat(styles.paddingBottom),
			buttonEdge: buttonEdgeProbe ? Number.parseFloat(getComputedStyle(buttonEdgeProbe).width) : 0,
			keypadPaddingLeft: keypad ? Number.parseFloat(getComputedStyle(keypad).paddingLeft) : 0,
			firstChildInset: firstChildBounds ? firstChildBounds.left - bounds.left - borderLeft : 0,
			overflowY: styles.overflowY,
			canScroll: info.scrollHeight > info.clientHeight
		};
	});

	expect(geometry.paddingLeft).toBe(geometry.keypadPaddingLeft);
	expect(geometry.paddingBottom).toBe(geometry.paddingLeft + geometry.buttonEdge);
	expect(geometry.firstChildInset).toBeCloseTo(geometry.paddingLeft, 0);
	expect(geometry.overflowY).toBe('auto');
	expect(geometry.canScroll).toBe(false);
});

test('maximizes the desktop grid without clipping its isometric border', async ({ page }) => {
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

	expect(gridBounds.height).toBeGreaterThan(0.9 * 1080);
	const bottomSpace = 1080 - (bottomEdgeBounds.y + bottomEdgeBounds.height);
	const pageGap = await page
		.locator('.app-container')
		.evaluate((app) => Number.parseFloat(getComputedStyle(app).paddingLeft));
	expect(bottomSpace).toBeGreaterThanOrEqual(pageGap - 1);
});

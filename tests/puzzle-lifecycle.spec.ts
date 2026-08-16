import { expect, test, type Page } from '@playwright/test';

const standardSolution = [
	'534678912',
	'672195348',
	'198342567',
	'859761423',
	'426853791',
	'713924856',
	'961537284',
	'287419635',
	'345286179'
].join('');

async function openPuzzle(page: Page) {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
}

async function beginSolve(page: Page) {
	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Start solving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Start solving', exact: true }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
}

async function enterGridValues(page: Page, values: string, omittedIndices: number[] = []) {
	const cells = page.locator('.sudoku-cell');
	const omitted = new Set(omittedIndices);

	for (let row = 0; row < 9; row += 1) {
		await cells.nth(row * 9).click();
		for (let column = 0; column < 9; column += 1) {
			const index = row * 9 + column;
			if (!omitted.has(index)) await page.keyboard.press(values[index]);
			if (column < 8) await page.keyboard.press('ArrowRight');
		}
	}
}

test('opens in Setup with editable clues and optional calculated candidates', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const app = page.locator('.app-container');
	const cells = page.locator('.sudoku-cell');
	const showCandidates = page.getByLabel('Show candidates');
	const peerFour = cells.nth(1).locator('[data-candidate="4"]');
	const peerFive = cells.nth(1).locator('[data-candidate="5"]');

	await expect(app).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(page.getByRole('button', { name: 'Erase clue' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toBeVisible();
	await expect(showCandidates).not.toBeChecked();
	await expect(peerFive).toBeHidden();
	await expect(page.getByLabel('Enter digit')).toHaveCount(0);
	await expect(page.getByLabel('Crossout candidate')).toHaveCount(0);
	await page.getByText('Info', { exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Puzzle setup' })).toBeVisible();
	const rulesSection = page.getByRole('button', { name: 'Rules', exact: true });
	const guideSection = page.getByRole('button', { name: 'Using Sudoku Note', exact: true });
	const controlsSection = page.getByRole('button', { name: 'Controls', exact: true });
	const settingsSection = page.getByRole('button', { name: 'Settings', exact: true });
	await expect(guideSection).toHaveAttribute('aria-expanded', 'true');
	await expect(rulesSection).toHaveAttribute('aria-expanded', 'false');
	await expect(controlsSection).toHaveAttribute('aria-expanded', 'false');
	await expect(settingsSection).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByText('workspace for solving a Sudoku you already have')).toBeVisible();
	await expect(page.getByText('copy the numbers provided by that puzzle')).toBeVisible();
	await expect(page.getByText('solving tools will become available')).toBeVisible();
	await rulesSection.click();
	await expect(guideSection).toHaveAttribute('aria-expanded', 'false');
	await expect(rulesSection).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('heading', { name: 'Standard Sudoku' })).toBeVisible();
	await expect(page.getByText('each appears once in every row, column, and 3×3 box')).toBeVisible();
	await controlsSection.click();
	await expect(rulesSection).toHaveAttribute('aria-expanded', 'false');
	await expect(controlsSection).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('heading', { name: 'Keyboard controls' })).toBeVisible();
	await settingsSection.click();
	await expect(controlsSection).toHaveAttribute('aria-expanded', 'false');
	await expect(settingsSection).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('label').filter({ hasText: 'Flipped notes' })).toBeVisible();
	await page.getByText('Keypad', { exact: true }).click();

	await cells.nth(0).click();
	await page.keyboard.press('3');
	await expect(cells.nth(0).locator('.value')).toHaveText('3');
	await page.keyboard.press('4');
	await expect(cells.nth(0).locator('.value')).toHaveText('4');

	await page.locator('label[title="Show candidates"]').click();
	await expect(showCandidates).toBeChecked();
	await expect(peerFour).toBeHidden();
	await expect(peerFive).toBeVisible();

	await page.keyboard.press('Delete');
	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
	await expect(peerFour).toBeVisible();

	await cells.nth(0).click();
	await cells.nth(10).click({ modifiers: ['Shift'] });
	await page.getByRole('button', { name: '3', exact: true }).click();
	await expect(cells.nth(0).locator('.value')).toHaveText('3');
	await expect(cells.nth(10).locator('.value')).toHaveText('3');
	await page.keyboard.press('4');
	await expect(cells.nth(0).locator('.value')).toHaveText('4');
	await expect(cells.nth(10).locator('.value')).toHaveText('4');
	await page.getByRole('button', { name: 'Erase clue' }).click();
	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
	await expect(cells.nth(10).locator('.value')).toHaveCount(0);

	await page.locator('label[title="Show candidates"]').click();
	await expect(showCandidates).not.toBeChecked();
	await expect(peerFive).toBeHidden();
});

test('requires confirmation and locks clues against keyboard and pointer edits', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const app = page.locator('.app-container');
	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await page.locator('label[title="Show candidates"]').click();

	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Start solving?' });
	await expect(dialog).toContainText(
		'The current digits will become fixed clues and the solve timer will begin.'
	);
	await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(dialog.getByRole('button', { name: 'Start solving', exact: true })).toBeFocused();
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toBeFocused();

	await expect(app).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	await expect(page.getByLabel('Show candidates')).toBeChecked();
	await expect(page.locator('.cell-background.selected')).toHaveCount(1);

	await beginSolve(page);
	await expect(page.getByRole('button', { name: '7', exact: true })).toBeFocused();
	const clue = cells.nth(0).locator('.value');
	await expect(clue).toHaveClass(/value-clue/);
	await expect(clue).toHaveCSS('font-weight', '700');
	await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toHaveCount(0);
	await expect(page.locator('label[title="Enter digit"]')).toBeVisible();
	await expect(page.locator('label[title="Crossout candidate"]')).toBeVisible();

	await page.keyboard.press('6');
	await page.keyboard.press('Delete');
	await page.getByRole('button', { name: '7', exact: true }).click();
	await page.getByRole('button', { name: 'Delete digit' }).click();
	await expect(clue).toHaveText('5');

	await cells.nth(1).click();
	await page.keyboard.press('6');
	const solverEntry = cells.nth(1).locator('.value');
	await expect(solverEntry).toHaveText('6');
	await expect(solverEntry).toHaveClass(/value-entry/);
	await page.getByRole('button', { name: '7', exact: true }).click();
	await expect(solverEntry).toHaveText('7');

	await cells.nth(0).click();
	await cells.nth(1).click({ modifiers: ['Shift'] });
	await page.locator('label[title="Enter digit"]').click();
	await page.keyboard.press('8');
	await expect(clue).toHaveText('5');
	await expect(solverEntry).toHaveText('8');
	await page.keyboard.press('Backspace');
	await expect(clue).toHaveText('5');
	await expect(cells.nth(1).locator('.value')).toHaveCount(0);
});

test('counts active solving time and completes once independently of candidate annotations', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);
	await page.clock.install();

	const cells = page.locator('.sudoku-cell');
	const finalCell = cells.nth(80);
	await enterGridValues(page, standardSolution, [80]);
	await page.clock.fastForward('00:20');

	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	const showLiveTimer = page.getByLabel('Show live timer');
	const showLiveTimerSwitch = page.locator('label').filter({ hasText: 'Show live timer' });
	await expect(showLiveTimer).not.toBeChecked();
	await showLiveTimerSwitch.click();
	await expect(page.getByRole('timer')).toHaveCount(0);
	await page.getByText('Keypad', { exact: true }).click();

	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	const startDialog = page.getByRole('dialog', { name: 'Start solving?' });
	await page.clock.fastForward('00:10');
	await startDialog.getByRole('button', { name: 'Start solving', exact: true }).click();
	await page.getByText('Info', { exact: true }).click();
	const liveTimer = page.getByRole('timer');
	await expect(liveTimer).toContainText('00:00');

	await page.clock.fastForward('01:05');
	await expect(liveTimer).toContainText('01:05');

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await page.clock.fastForward('00:30');
	await expect(liveTimer).toContainText('01:05');
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await page.clock.fastForward('00:01');
	await expect(liveTimer).toContainText('01:06');

	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await showLiveTimerSwitch.click();
	await expect(liveTimer).toHaveCount(0);
	await page.clock.fastForward('01:00:00');
	await showLiveTimerSwitch.click();
	await expect(page.getByRole('timer')).toContainText('01:01:06');

	await page.getByText('Keypad', { exact: true }).click();
	await finalCell.click();
	await page.locator('.keypad label[title="Add candidate"]').click();
	await page.keyboard.press('1');
	await expect(finalCell.locator('[data-candidate="1"]')).toHaveClass(/candidate-invalid/);
	await page.locator('.keypad label[title="Enter digit"]').click();
	await page.keyboard.press('9');

	const completionDialog = page.getByRole('dialog', { name: 'Congratulations!' });
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'completed');
	await expect(completionDialog).toContainText('01:01:06');
	const viewPuzzle = completionDialog.getByRole('button', { name: 'View puzzle' });
	const editFromCompletion = completionDialog.getByRole('button', { name: 'Edit puzzle' });
	await page.keyboard.press('Control+z');
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await expect(completionDialog).not.toBeVisible();
	await expect(finalCell.locator('.value')).toHaveCount(0);
	await page.keyboard.press('Control+Shift+z');
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'completed');
	await expect(completionDialog).toBeVisible();
	await expect(finalCell.locator('.value')).toHaveText('9');
	await expect(completionDialog).toContainText('01:01:06');
	await expect(viewPuzzle).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(editFromCompletion).toBeFocused();
	await page.keyboard.press('Tab');
	expect(await completionDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(
		true
	);
	await editFromCompletion.click();
	const editDialog = page.getByRole('dialog', { name: 'Return to Setup?' });
	await expect(editDialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
	await editDialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(completionDialog).toBeVisible();
	await expect(viewPuzzle).toBeFocused();
	await viewPuzzle.click();
	await expect(completionDialog).not.toBeVisible();
	await expect(page.locator('.sudoku-grid')).toBeFocused();

	await page.keyboard.press('8');
	await page.keyboard.press('Backspace');
	await page.clock.fastForward('10:00');
	await expect(finalCell.locator('.value')).toHaveText('9');
	await expect(completionDialog).not.toBeVisible();
	await page.getByText('Info', { exact: true }).click();
	await expect(page.getByRole('timer')).toContainText('01:01:06');

	const settings = page.getByRole('button', { name: 'Settings', exact: true });
	if ((await settings.getAttribute('aria-expanded')) === 'false') await settings.click();
	const editPuzzle = page.getByRole('button', { name: 'Edit puzzle' });
	await editPuzzle.click();
	await expect(editDialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
	await editDialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(editPuzzle).toBeFocused();
	await editPuzzle.click();
	await editDialog.getByRole('button', { name: 'Return to Setup' }).click();

	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(finalCell.locator('.value')).toHaveCount(0);
	await expect(finalCell.locator('[data-candidate="1"]')).not.toHaveClass(/candidate-invalid/);
	await expect(page.getByRole('timer')).toHaveCount(0);
	await expect(settings).toBeFocused();
});

test('keeps a full standard-invalid grid in Solving without opening completion UI', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const invalidSolution = Array.from({ length: 9 }, (_, row) =>
		Array.from({ length: 9 }, (_, column) => ((row + column) % 9) + 1).join('')
	).join('');
	await enterGridValues(page, invalidSolution);
	await beginSolve(page);

	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await expect(page.getByRole('dialog', { name: 'Congratulations!' })).toHaveCount(0);
	await expect(page.locator('.cell-background.conflict')).not.toHaveCount(0);
	await page.keyboard.press('1');
	await expect(page.getByRole('dialog', { name: 'Congratulations!' })).toHaveCount(0);
});

test('Edit puzzle preserves clues and discards the solving session', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('1');
	await cells.nth(1).click();
	await page.keyboard.press('2');
	await beginSolve(page);

	await cells.nth(10).click();
	await page.keyboard.press('3');
	await cells.nth(20).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.keyboard.press('4');
	await expect(cells.nth(20).locator('[data-candidate="4"]')).toHaveClass(/candidate-crossed-out/);
	await page.locator('.keypad label[title="Multi-select"]').click();
	await expect(page.getByLabel('Multi-select')).toBeChecked();

	await page.getByText('Info', { exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Using Sudoku Note', exact: true })
	).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText('numbers copied during Setup are now fixed clues')).toBeVisible();
	await expect(
		page.getByText('Returning to Setup will discard the current solving progress')
	).toBeVisible();
	await page.getByRole('button', { name: 'Rules', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Standard Sudoku' })).toBeVisible();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await page.getByRole('button', { name: 'Edit puzzle' }).click();
	const dialog = page.getByRole('dialog', { name: 'Return to Setup?' });
	await expect(dialog).toContainText('Your solving progress and current time will be cleared.');
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await expect(cells.nth(10).locator('.value')).toHaveText('3');

	await page.getByRole('button', { name: 'Edit puzzle' }).click();
	await dialog.getByRole('button', { name: 'Return to Setup' }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(page.locator('.cell-background.selected')).toHaveCount(0);
	await expect(cells.nth(0).locator('.value')).toHaveText('1');
	await expect(cells.nth(1).locator('.value')).toHaveText('2');
	await expect(cells.nth(10).locator('.value')).toHaveCount(0);
	await expect(cells.nth(20).locator('[data-candidate="4"]')).not.toHaveClass(
		/candidate-crossed-out/
	);
	await expect(page.getByLabel('Enter digit')).toHaveCount(0);

	await page.getByText('Keypad', { exact: true }).click();
	await expect(page.getByLabel('Show candidates')).not.toBeChecked();
	await expect(page.getByLabel('Multi-select')).not.toBeChecked();
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	await page.keyboard.press('Backspace');
	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
});

test('keeps lifecycle controls usable in wide, side, and stacked layouts', async ({ page }) => {
	const layouts = [
		{ width: 1920, height: 1080, className: 'layout-wide' },
		{ width: 844, height: 390, className: 'layout-side' },
		{ width: 390, height: 844, className: 'layout-stacked' }
	];

	for (const layout of layouts) {
		await page.setViewportSize({ width: layout.width, height: layout.height });
		await openPuzzle(page);
		const app = page.locator('.app-container');
		await expect(app).toHaveClass(new RegExp(layout.className));
		await expect(page.getByRole('button', { name: 'Erase clue' })).toBeVisible();
		await expect(page.locator('label[title="Show candidates"]')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toBeVisible();

		if (layout.className !== 'layout-wide') {
			await page.getByText('Info', { exact: true }).click();
		}
		await page.getByRole('button', { name: 'Settings', exact: true }).click();
		await expect(page.locator('label').filter({ hasText: 'Dark Mode' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'New puzzle', exact: true })).toBeVisible();
		if (!(await page.getByLabel('Show live timer').isChecked())) {
			await page.locator('label').filter({ hasText: 'Show live timer' }).click();
		}
		if (layout.className !== 'layout-wide') {
			await page.getByText('Keypad', { exact: true }).click();
		}

		await beginSolve(page);
		await expect(page.getByRole('button', { name: 'Delete digit' })).toBeVisible();
		await expect(page.locator('label[title="Bold candidate"]')).toBeVisible();
		if (layout.className !== 'layout-wide') {
			await expect(page.getByRole('timer')).toHaveCount(0);
			await page.getByText('Info', { exact: true }).click();
		}
		await expect(page.getByRole('timer')).toBeVisible();
		await expect(app).toHaveClass(new RegExp(layout.className));
		expect(
			await page.evaluate(() => ({
				horizontal: document.documentElement.scrollWidth > innerWidth,
				vertical: document.documentElement.scrollHeight > innerHeight
			}))
		).toEqual({ horizontal: false, vertical: false });

		const settings = page.getByRole('button', { name: 'Settings', exact: true });
		if ((await settings.getAttribute('aria-expanded')) === 'false') await settings.click();
		await page.getByRole('button', { name: 'New puzzle', exact: true }).click();
		const newPuzzleDialog = page.getByRole('dialog', { name: 'Start a new puzzle?' });
		await expect(newPuzzleDialog).toBeVisible();
		const dialogBounds = await newPuzzleDialog.boundingBox();
		expect(dialogBounds).not.toBeNull();
		if (dialogBounds) {
			expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
			expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
			expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(layout.width + 1);
			expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(layout.height + 1);
		}
		await newPuzzleDialog.getByRole('button', { name: 'New puzzle', exact: true }).click();
		await expect(app).toHaveAttribute('data-puzzle-phase', 'setup');
	}
});

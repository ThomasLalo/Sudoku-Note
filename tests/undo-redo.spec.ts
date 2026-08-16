import { expect, test, type Page } from '@playwright/test';

async function openPuzzle(page: Page) {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
}

async function beginSolve(page: Page) {
	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	await page
		.getByRole('dialog', { name: 'Start solving?' })
		.getByRole('button', { name: 'Start solving', exact: true })
		.click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
}

test('undoes and redoes a multi-cell edit as one action', async ({ page }) => {
	await openPuzzle(page);
	await beginSolve(page);

	const cells = page.locator('.sudoku-cell');
	const undo = page.getByRole('button', { name: 'Undo' });
	const redo = page.getByRole('button', { name: 'Redo' });
	await expect(undo).toBeDisabled();
	await expect(redo).toBeDisabled();

	await cells.nth(0).click();
	await cells.nth(10).click({ modifiers: ['Shift'] });
	await page.getByRole('button', { name: '3', exact: true }).click();
	await expect(cells.nth(0).locator('.value')).toHaveText('3');
	await expect(cells.nth(10).locator('.value')).toHaveText('3');
	await expect(undo).toBeEnabled();
	await expect(redo).toBeDisabled();

	await undo.click();
	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
	await expect(cells.nth(10).locator('.value')).toHaveCount(0);
	await expect(page.locator('.cell-background.selected')).toHaveCount(2);
	await expect(redo).toBeEnabled();

	await redo.click();
	await expect(cells.nth(0).locator('.value')).toHaveText('3');
	await expect(cells.nth(10).locator('.value')).toHaveText('3');

	await undo.click();
	await page.keyboard.press('Control+4');
	await expect(cells.nth(0).locator('.value')).toHaveText('4');
	await expect(cells.nth(10).locator('.value')).toHaveText('4');
	await expect(redo).toBeDisabled();
});

test('supports keyboard undo and both standard redo shortcuts for candidate edits', async ({
	page
}) => {
	await openPuzzle(page);
	await beginSolve(page);

	const cell = page.locator('.sudoku-cell').first();
	const candidate = cell.locator('[data-candidate="4"]');
	await cell.click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.keyboard.press('4');
	await expect(candidate).toHaveClass(/candidate-crossed-out/);

	await page.keyboard.press('Control+z');
	await expect(candidate).not.toHaveClass(/candidate-crossed-out/);
	await page.keyboard.press('Control+Shift+z');
	await expect(candidate).toHaveClass(/candidate-crossed-out/);
	await page.keyboard.press('Control+z');
	await page.keyboard.press('Control+y');
	await expect(candidate).toHaveClass(/candidate-crossed-out/);
});

test('tracks Setup edits and starts Solving with fresh history', async ({ page }) => {
	await openPuzzle(page);

	const cell = page.locator('.sudoku-cell').first();
	const undo = page.getByRole('button', { name: 'Undo' });
	const redo = page.getByRole('button', { name: 'Redo' });
	await cell.click();
	await page.keyboard.press('5');
	await expect(cell.locator('.value')).toHaveText('5');

	await page.keyboard.press('Control+z');
	await expect(cell.locator('.value')).toHaveCount(0);
	await expect(redo).toBeEnabled();
	await page.keyboard.press('Control+Shift+z');
	await expect(cell.locator('.value')).toHaveText('5');

	await beginSolve(page);
	await expect(undo).toBeDisabled();
	await expect(redo).toBeDisabled();
});

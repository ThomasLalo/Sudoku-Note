import { expect, test, type Locator, type Page } from '@playwright/test';
import {
	areKillerCagesComplete,
	areOrthogonallyAdjacentCellIndexes,
	getKillerCageConflictIndexes,
	getValidKillerCageSums
} from '../src/lib/killerCages';

async function openPuzzle(page: Page) {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
}

async function centerOf(cell: Locator) {
	const bounds = await cell.boundingBox();
	if (!bounds) throw new Error('Sudoku cell has no bounds.');
	return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

async function drawCage(page: Page, cellIndexes: number[], browserMoveSteps = 5) {
	const cells = page.locator('.sudoku-cell');
	const points = await Promise.all(cellIndexes.map((cellIndex) => centerOf(cells.nth(cellIndex))));
	await page.mouse.move(points[0].x, points[0].y);
	await page.mouse.down();
	for (const point of points.slice(1)) {
		await page.mouse.move(point.x, point.y, { steps: browserMoveSteps });
	}
	await page.mouse.up();
}

test('calculates cage sums and applies Killer Sudoku uniqueness and total rules', () => {
	expect(getValidKillerCageSums(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	expect(getValidKillerCageSums(2)).toEqual(Array.from({ length: 15 }, (_, index) => index + 3));
	expect(getValidKillerCageSums(9)).toEqual([45]);
	expect(areOrthogonallyAdjacentCellIndexes(0, 1)).toBe(true);
	expect(areOrthogonallyAdjacentCellIndexes(0, 9)).toBe(true);
	expect(areOrthogonallyAdjacentCellIndexes(0, 10)).toBe(false);
	expect(areOrthogonallyAdjacentCellIndexes(8, 9)).toBe(false);

	const cage = [{ sum: 6, cells: [0, 1, 10] }];
	const values = Array.from({ length: 81 }, () => null as number | null);
	values[0] = 1;
	values[1] = 2;
	values[10] = 3;
	expect(areKillerCagesComplete(values, cage)).toBe(true);
	expect(getKillerCageConflictIndexes(values, cage)).toEqual(new Set());
	values[10] = 2;
	expect(areKillerCagesComplete(values, cage)).toBe(false);
	expect(getKillerCageConflictIndexes(values, cage)).toEqual(new Set([0, 1, 10]));
});

test('draws a connected cage, offers only valid sums, and persists the result', async ({
	page
}) => {
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await page.locator('label[title="Draw killer cage"]').click();
	await expect(page.getByLabel('Draw killer cage')).toBeChecked();

	await drawCage(page, [0, 1]);
	const sumDialog = page.getByRole('dialog', { name: 'Choose cage sum' });
	await expect(sumDialog).toContainText('2 cells selected');
	await expect(sumDialog.locator('.killer-cage-sums button')).toHaveCount(15);
	await expect(sumDialog.getByRole('button', { name: '2', exact: true })).toHaveCount(0);
	await expect(sumDialog.getByRole('button', { name: '3', exact: true })).toBeVisible();
	await expect(sumDialog.getByRole('button', { name: '17', exact: true })).toBeVisible();
	await sumDialog.getByRole('button', { name: '13', exact: true }).click();

	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(1);
	const cageSum = cells.nth(0).locator('[data-killer-cage-sum="13"]');
	await expect(cageSum).toHaveText('13');
	await page.locator('label[title="Show candidates"]').click();
	const firstCageCandidates = cells.nth(0).locator('.candidate-grid');
	const secondCageCandidates = cells.nth(1).locator('.candidate-grid');
	await expect(firstCageCandidates).toHaveClass(/cage-edge-top/);
	await expect(firstCageCandidates).toHaveClass(/cage-edge-bottom/);
	await expect(firstCageCandidates).toHaveClass(/cage-edge-left/);
	await expect(firstCageCandidates).not.toHaveClass(/cage-edge-right/);
	await expect(secondCageCandidates).toHaveClass(/cage-edge-top/);
	await expect(secondCageCandidates).toHaveClass(/cage-edge-right/);
	await expect(secondCageCandidates).toHaveClass(/cage-edge-bottom/);
	await expect(secondCageCandidates).not.toHaveClass(/cage-edge-left/);
	const topLeftCandidate = cells.nth(0).locator('[data-candidate="7"] .candidate-text');
	await expect(topLeftCandidate).toBeVisible();

	for (const viewport of [
		{ width: 1400, height: 1000 },
		{ width: 390, height: 844 }
	]) {
		await page.setViewportSize(viewport);
		await page.evaluate(() => new Promise(requestAnimationFrame));
		const sumBounds = await cageSum.boundingBox();
		const candidateBounds = await topLeftCandidate.boundingBox();
		expect(sumBounds).not.toBeNull();
		expect(candidateBounds).not.toBeNull();
		if (!sumBounds || !candidateBounds) continue;
		const overlaps =
			sumBounds.x < candidateBounds.x + candidateBounds.width &&
			sumBounds.x + sumBounds.width > candidateBounds.x &&
			sumBounds.y < candidateBounds.y + candidateBounds.height &&
			sumBounds.y + sumBounds.height > candidateBounds.y;
		expect(overlaps, JSON.stringify({ viewport, sumBounds, candidateBounds })).toBe(false);
	}
	await page.setViewportSize({ width: 1400, height: 1000 });
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(0);
	await page.getByRole('button', { name: 'Redo' }).click();
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(1);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(1);
	await expect(cells.nth(0).locator('[data-killer-cage-sum="13"]')).toHaveText('13');

	await cells.nth(0).click();
	await page.getByRole('button', { name: 'Erase clue or constraint' }).click();
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(0);
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(1);
});

test('rejects diagonal additions and overlapping cage starts', async ({ page }) => {
	await openPuzzle(page);

	await page.locator('label[title="Draw German whispers"]').click();
	await expect(page.getByLabel('Draw German whispers')).toBeChecked();
	await page.locator('label[title="Draw killer cage"]').click();
	await expect(page.getByLabel('Draw German whispers')).not.toBeChecked();
	await expect(page.getByLabel('Draw killer cage')).toBeChecked();
	await drawCage(page, [0, 1]);
	let sumDialog = page.getByRole('dialog', { name: 'Choose cage sum' });
	await sumDialog.getByRole('button', { name: '3', exact: true }).click();

	// A direct diagonal move cannot add the destination, so only the origin remains in the draft.
	await drawCage(page, [9, 19], 1);
	sumDialog = page.getByRole('dialog', { name: 'Choose cage sum' });
	await expect(sumDialog).toContainText('1 cell selected');
	await sumDialog.getByRole('button', { name: 'Cancel' }).click();

	await page.locator('.sudoku-cell').nth(0).click();
	await expect(sumDialog).not.toBeVisible();
	await expect(page.locator('.killer-cage:not(.killer-cage-draft)')).toHaveCount(1);
});

test('leaves candidates un-narrowed while applying cage conflicts', async ({ page }) => {
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await page.locator('label[title="Draw killer cage"]').click();
	await drawCage(page, [2, 3, 12]);
	await page
		.getByRole('dialog', { name: 'Choose cage sum' })
		.getByRole('button', { name: '6', exact: true })
		.click();
	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	await page
		.getByRole('dialog', { name: 'Start solving?' })
		.getByRole('button', { name: 'Start solving', exact: true })
		.click();

	// A 4 cannot participate in three distinct digits totaling 6, but Show Candidates does not
	// reveal that cage deduction.
	await expect(cells.nth(2).locator('[data-candidate="4"]')).toBeVisible();

	await cells.nth(2).click();
	await page.keyboard.press('1');
	// Cell 12 is in a different row, column, and box from cell 2. The shared cage does not remove 1.
	await expect(cells.nth(12).locator('[data-candidate="1"]')).toBeVisible();
	await cells.nth(3).click();
	await page.keyboard.press('2');
	await cells.nth(12).click();
	await page.keyboard.press('4');
	await expect(page.locator('.cell-background.conflict')).toHaveCount(3);
});

import { expect, test, type Locator, type Page } from '@playwright/test';

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

async function drawLine(page: Page, cellIndexes: number[], browserMoveSteps = 5) {
	const cells = page.locator('.sudoku-cell');
	const points = await Promise.all(cellIndexes.map((cellIndex) => centerOf(cells.nth(cellIndex))));
	await page.mouse.move(points[0].x, points[0].y);
	await page.mouse.down();
	for (const point of points.slice(1)) {
		await page.mouse.move(point.x, point.y, { steps: browserMoveSteps });
	}
	await page.mouse.up();
}

test('draws and restores diagonal German Whispers without narrowing candidates', async ({
	page
}) => {
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	const drawTool = page.locator('label[title="Draw German whispers"]');
	await drawTool.click();
	await expect(page.getByLabel('Draw German whispers')).toBeChecked();

	// One direct move across two corners should resolve to the intended diagonal cells.
	await drawLine(page, [0, 20], 1);
	const whisperLine = page.locator('.german-whisper-line:not(.german-whisper-line-draft)');
	await expect(whisperLine).toHaveCount(1);
	await expect(whisperLine).toHaveAttribute('points', '0.5,0.5 1.5,1.5 2.5,2.5');

	await page.locator('label[title="Show candidates"]').click();
	await expect(cells.nth(0).locator('[data-candidate="5"]')).toBeVisible();
	await expect(cells.nth(10).locator('[data-candidate="5"]')).toBeVisible();
	await expect(cells.nth(20).locator('[data-candidate="5"]')).toBeVisible();
	await expect(cells.nth(2).locator('[data-candidate="5"]')).toBeVisible();

	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(whisperLine).toHaveCount(0);
	await expect(cells.nth(0).locator('[data-candidate="5"]')).toBeVisible();
	await page.getByRole('button', { name: 'Redo' }).click();
	await expect(whisperLine).toHaveCount(1);
	await expect(cells.nth(0).locator('[data-candidate="5"]')).toBeVisible();

	await drawTool.click();
	await cells.nth(0).click();
	await page.keyboard.press('3');
	await cells.nth(10).click();
	await page.keyboard.press('7');
	await expect(page.locator('.cell-background.conflict')).toHaveCount(2);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await expect(whisperLine).toHaveCount(1);
	await page.locator('label[title="Show candidates"]').click();
	await expect(cells.nth(20).locator('[data-candidate="5"]')).toBeVisible();

	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Rules', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'German Whispers' })).toBeVisible();
	await expect(page.getByText('must differ by at least 5')).toBeVisible();
});

test('erase cuts a one-cell gap while preserving both sides of a whisper line', async ({
	page
}) => {
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	const whisperLines = page.locator('.german-whisper-line:not(.german-whisper-line-draft)');
	await page.locator('label[title="Draw German whispers"]').click();
	await drawLine(page, [0, 1, 2, 3, 4]);
	await expect(whisperLines).toHaveCount(1);

	await page.locator('label[title="Draw German whispers"]').click();
	await page.locator('label[title="Show candidates"]').click();
	await cells.nth(2).click();
	await page.keyboard.press('6');
	await page.getByRole('button', { name: 'Erase clue or constraint' }).click();

	await expect(cells.nth(2).locator('.value')).toHaveCount(0);
	await expect(whisperLines).toHaveCount(2);
	expect(
		await whisperLines.evaluateAll((lines) => lines.map((line) => line.getAttribute('points')))
	).toEqual(['0.5,0.5 1.5,0.5', '3.5,0.5 4.5,0.5']);
	await expect(cells.nth(2).locator('[data-candidate="5"]')).toBeVisible();
	await expect(cells.nth(1).locator('[data-candidate="5"]')).toBeVisible();
	await expect(cells.nth(3).locator('[data-candidate="5"]')).toBeVisible();

	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(whisperLines).toHaveCount(1);
	await expect(cells.nth(2).locator('.value')).toHaveText('6');
});

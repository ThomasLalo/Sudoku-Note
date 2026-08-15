import { expect, test, type Page } from '@playwright/test';
import { initializeGrid, type Cell } from '../src/lib/gridUtils';
import {
	currentPuzzleStorageKey,
	decodeStoredPuzzleState,
	encodeStoredPuzzleState
} from '../src/lib/puzzlePersistence';
import { serializePuzzleState } from '../src/lib/puzzleSerialization';
import {
	createUserPreferences,
	parseUserPreferences,
	serializeUserPreferences,
	userPreferencesStorageKey,
	userPreferencesVersion
} from '../src/lib/userPreferences';

const standardSolution =
	'534678912672195348198342567859761423426853791713924856961537284287419635345286179';

async function openPuzzle(page: Page) {
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

function rowMajorCells(gridState: Cell[][]) {
	return gridState
		.flat()
		.sort(
			(left, right) =>
				left.rowNumber0based * 9 +
				left.colNumber0based -
				(right.rowNumber0based * 9 + right.colNumber0based)
		);
}

test('restores Setup clues after reload and keeps them editable', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await cells.nth(10).click();
	await page.keyboard.press('7');
	await page.locator('label[title="Show candidates"]').click();

	await expect
		.poll(() => page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey))
		.not.toBeNull();
	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });

	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	await expect(cells.nth(10).locator('.value')).toHaveText('7');
	await expect(page.getByLabel('Show candidates')).not.toBeChecked();

	await cells.nth(0).click();
	await page.keyboard.press('6');
	await expect(cells.nth(0).locator('.value')).toHaveText('6');
	await page.keyboard.press('Delete');
	await expect(cells.nth(0).locator('.value')).toHaveCount(0);
});

test('restores Solving entries, annotations, and active time without timer-tick writes', async ({
	page
}) => {
	await page.addInitScript((storageKey) => {
		const originalSetItem = Storage.prototype.setItem;
		(window as typeof window & { puzzleStorageWrites: number }).puzzleStorageWrites = 0;
		Storage.prototype.setItem = function (key, value) {
			if (key === storageKey) {
				(window as typeof window & { puzzleStorageWrites: number }).puzzleStorageWrites += 1;
			}
			return originalSetItem.call(this, key, value);
		};
	}, currentPuzzleStorageKey);
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);
	await page.clock.install();

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await beginSolve(page);
	await cells.nth(1).click();
	await page.keyboard.press('3');
	await cells.nth(2).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.keyboard.press('4');
	await page.locator('.keypad label[title="Bold candidate"]').click();
	await page.keyboard.press('7');
	await page.locator('.keypad label[title="Add candidate"]').click();
	await page.keyboard.press('5');

	const writesBeforeTimerTicks = await page.evaluate(
		() => (window as typeof window & { puzzleStorageWrites: number }).puzzleStorageWrites
	);
	await page.clock.fastForward('00:05');
	await expect
		.poll(() =>
			page.evaluate(
				() => (window as typeof window & { puzzleStorageWrites: number }).puzzleStorageWrites
			)
		)
		.toBe(writesBeforeTimerTicks);

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	const savedElapsed = await page.evaluate((storageKey) => {
		const stored = localStorage.getItem(storageKey);
		if (stored === null) return null;
		const envelope = JSON.parse(stored) as { solveSession: string };
		return (JSON.parse(envelope.solveSession) as { elapsedMilliseconds: number })
			.elapsedMilliseconds;
	}, currentPuzzleStorageKey);
	expect(savedElapsed).not.toBeNull();
	if (savedElapsed === null) return;
	expect(savedElapsed).toBeGreaterThanOrEqual(5_000);
	expect(savedElapsed).toBeLessThan(6_000);

	await page.clock.fastForward('00:30');
	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');

	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	await expect(cells.nth(0).locator('.value')).toHaveClass(/value-clue/);
	await expect(cells.nth(1).locator('.value')).toHaveText('3');
	await expect(cells.nth(1).locator('.value')).toHaveClass(/value-entry/);
	await expect(cells.nth(2).locator('[data-candidate="4"]')).toHaveClass(/candidate-crossed-out/);
	await expect(cells.nth(2).locator('[data-candidate="7"]')).toHaveClass(/candidate-bold/);
	await expect(cells.nth(2).locator('[data-candidate="5"]')).toHaveClass(/candidate-invalid/);
	await expect(page.locator('.cell-background.selected')).toHaveCount(0);

	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await page.locator('label').filter({ hasText: 'Show live timer' }).click();
	const liveTimer = page.getByRole('timer');
	await expect(liveTimer).toContainText('00:05');
	const restoredTimerText = await liveTimer.textContent();
	const restoredSeconds = Number(restoredTimerText?.match(/(\d{2}):(\d{2})$/)?.[2]);
	await page.clock.fastForward('00:01');
	await expect
		.poll(async () => Number((await liveTimer.textContent())?.match(/(\d{2}):(\d{2})$/)?.[2]))
		.toBeGreaterThan(restoredSeconds);
});

test('restores Completed with its frozen time and completion overlay', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const setupGrid = initializeGrid();
	const setupCells = rowMajorCells(setupGrid);
	for (const [index, digit] of [...standardSolution].entries()) {
		if (index === 80) continue;
		setupCells[index].fillNumber = Number(digit);
		setupCells[index].isClue = true;
	}
	const storedSetup = encodeStoredPuzzleState(serializePuzzleState(setupGrid, 'setup', 0));
	await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
		key: currentPuzzleStorageKey,
		value: storedSetup
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
	await page.clock.install();

	await beginSolve(page);
	await page.clock.fastForward('02:03');
	const cells = page.locator('.sudoku-cell');
	await cells.nth(80).click();
	await page.keyboard.press('9');
	const completionDialog = page.getByRole('dialog', { name: 'Congratulations!' });
	await expect(completionDialog).toContainText('02:03');
	await completionDialog.getByRole('button', { name: 'View puzzle' }).click();

	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'completed');
	await expect(cells.nth(0).locator('.value')).toHaveClass(/value-clue/);
	await expect(cells.nth(80).locator('.value')).toHaveClass(/value-entry/);
	await expect(completionDialog).toBeVisible();
	await expect(completionDialog).toContainText('02:03');
	await page.clock.fastForward('10:00');
	await expect(completionDialog).toContainText('02:03');
});

test('ignores corrupt, partial, and unsupported saved records atomically', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const validState = serializePuzzleState(initializeGrid(), 'setup', 0);
	const unsupportedSession = JSON.stringify({
		...(JSON.parse(validState.solveSession) as Record<string, unknown>),
		version: 999
	});
	const invalidRecords = [
		'{',
		JSON.stringify({ puzzleDefinition: validState.puzzleDefinition }),
		encodeStoredPuzzleState({ ...validState, solveSession: unsupportedSession })
	];

	for (const invalidRecord of invalidRecords) {
		await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
			key: currentPuzzleStorageKey,
			value: invalidRecord
		});
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
		await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
		await expect(page.locator('.sudoku-cell .value')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toBeVisible();
	}
});

test('New puzzle clears only puzzle data and begins fresh', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	await page.evaluate(() => localStorage.setItem('unrelated-preference', 'keep'));
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await page.locator('label').filter({ hasText: 'Dark Mode' }).click();
	await page.getByText('Keypad', { exact: true }).click();
	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await beginSolve(page);
	await cells.nth(1).click();
	await page.keyboard.press('3');
	await expect
		.poll(() => page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey))
		.not.toBeNull();

	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	const newPuzzleButton = page.getByRole('button', { name: 'New puzzle', exact: true });
	await newPuzzleButton.click();
	const dialog = page.getByRole('dialog', { name: 'Start a new puzzle?' });
	await expect(dialog).toContainText(
		'This will clear the current puzzle and solving progress from this browser.'
	);
	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	await expect(cells.nth(1).locator('.value')).toHaveText('3');
	expect(
		await page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey)
	).not.toBeNull();

	await newPuzzleButton.click();
	await dialog.getByRole('button', { name: 'New puzzle', exact: true }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(cells.locator('.value')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Start solving', exact: true })).toBeFocused();
	await expect
		.poll(() =>
			page.evaluate(
				(key) => ({
					puzzle: localStorage.getItem(key),
					theme: localStorage.getItem('theme'),
					unrelated: localStorage.getItem('unrelated-preference')
				}),
				currentPuzzleStorageKey
			)
		)
		.toEqual({ puzzle: null, theme: 'dark', unrelated: 'keep' });

	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(cells.locator('.value')).toHaveCount(0);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('restores Info settings independently and preserves them for a new puzzle', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await beginSolve(page);
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();

	const darkMode = page.getByLabel('Dark Mode');
	const flippedNotes = page.getByLabel('Flipped notes');
	const showLiveTimer = page.getByLabel('Show live timer');
	const returnToReveal = page.getByLabel('Return to Reveal after edits');
	await page.locator('label').filter({ hasText: 'Dark Mode' }).click();
	await page.locator('label').filter({ hasText: 'Flipped notes' }).click();
	await page.locator('label').filter({ hasText: 'Show live timer' }).click();
	await page.locator('label').filter({ hasText: 'Return to Reveal after edits' }).click();
	await expect(darkMode).toBeChecked();
	await expect(flippedNotes).toBeChecked();
	await expect(showLiveTimer).toBeChecked();
	await expect(returnToReveal).not.toBeChecked();

	const storedPreferences = await page.evaluate(
		(key) => localStorage.getItem(key),
		userPreferencesStorageKey
	);
	expect(storedPreferences).not.toBeNull();
	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'solving');
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await expect(darkMode).toBeChecked();
	await expect(flippedNotes).toBeChecked();
	await expect(showLiveTimer).toBeChecked();
	await expect(returnToReveal).not.toBeChecked();

	await page.getByRole('button', { name: 'New puzzle', exact: true }).click();
	await page
		.getByRole('dialog', { name: 'Start a new puzzle?' })
		.getByRole('button', { name: 'New puzzle', exact: true })
		.click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	expect(
		await page.evaluate(
			({ puzzleKey, preferencesKey }) => ({
				puzzle: localStorage.getItem(puzzleKey),
				preferences: localStorage.getItem(preferencesKey)
			}),
			{ puzzleKey: currentPuzzleStorageKey, preferencesKey: userPreferencesStorageKey }
		)
	).toEqual({ puzzle: null, preferences: storedPreferences });

	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await expect(darkMode).toBeChecked();
	await expect(flippedNotes).toBeChecked();
	await expect(showLiveTimer).toBeChecked();
	await page.getByText('Keypad', { exact: true }).click();
	await beginSolve(page);
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await expect(returnToReveal).not.toBeChecked();
});

test('restores the existing theme and user-preference keys independently', async ({ page }) => {
	const storedPreferences = serializeUserPreferences(createUserPreferences(true, true, false));
	await page.addInitScript(
		({ preferencesKey, preferences }) => {
			localStorage.setItem('theme', 'dark');
			localStorage.setItem(preferencesKey, preferences);
		},
		{ preferencesKey: userPreferencesStorageKey, preferences: storedPreferences }
	);
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await expect(page.getByLabel('Dark Mode')).toBeChecked();
	await expect(page.getByLabel('Flipped notes')).toBeChecked();
	await expect(page.getByLabel('Show live timer')).toBeChecked();
	expect(
		await page.evaluate(
			(preferencesKey) => ({
				theme: localStorage.getItem('theme'),
				preferences: localStorage.getItem(preferencesKey)
			}),
			userPreferencesStorageKey
		)
	).toEqual({ theme: 'dark', preferences: storedPreferences });
});

test('validates the local-storage envelope before deserializing either half', () => {
	const validState = serializePuzzleState(initializeGrid(), 'setup', 0);
	const encoded = encodeStoredPuzzleState(validState);

	expect(decodeStoredPuzzleState(encoded)).toMatchObject({
		ok: true,
		value: { puzzlePhase: 'setup', elapsedMilliseconds: 0 }
	});
	expect(decodeStoredPuzzleState('{')).toMatchObject({
		ok: false,
		error: { code: 'invalid-json' }
	});
	expect(
		decodeStoredPuzzleState(JSON.stringify({ puzzleDefinition: validState.puzzleDefinition }))
	).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
});

test('round-trips and strictly validates versioned user preferences', () => {
	const preferences = createUserPreferences(true, true, false);
	const serialized = serializeUserPreferences(preferences);

	expect(parseUserPreferences(serialized)).toEqual({ ok: true, value: preferences });
	expect(parseUserPreferences('{')).toMatchObject({
		ok: false,
		error: { code: 'invalid-json' }
	});
	expect(
		parseUserPreferences(JSON.stringify({ ...preferences, version: userPreferencesVersion + 1 }))
	).toMatchObject({ ok: false, error: { code: 'unsupported-version' } });
	expect(
		parseUserPreferences(JSON.stringify({ ...preferences, showLiveTimer: 'yes' }))
	).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
});

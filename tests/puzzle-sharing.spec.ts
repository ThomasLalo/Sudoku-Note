import { expect, test, type Page } from '@playwright/test';
import { deflate, inflate } from 'pako';
import { initializeGrid, type Cell } from '../src/lib/gridUtils';
import { currentPuzzleStorageKey } from '../src/lib/puzzlePersistence';
import {
	createPuzzleDefinition,
	puzzleDefinitionVersion,
	serializePuzzleDefinition
} from '../src/lib/puzzleSerialization';
import {
	createShareUrl,
	decodeSharedPuzzleFragment,
	maximumDecompressedDefinitionLength,
	maximumSharePayloadLength,
	shareLinkCodecVersion
} from '../src/lib/puzzleSharing';

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

function encodeBase64Url(bytes: Uint8Array) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function compressedPayload(puzzleDefinition: string, version = shareLinkCodecVersion) {
	const compressed = deflate(new TextEncoder().encode(puzzleDefinition), { level: 9 });
	return `${version}.${encodeBase64Url(compressed)}`;
}

function legacyEnvelope(puzzleDefinition: string) {
	return encodeBase64Url(
		new TextEncoder().encode(
			JSON.stringify({
				format: 'sudoku-note-share-link',
				version: 1,
				puzzleDefinition
			})
		)
	);
}

function definitionWithClue(digit: number) {
	const gridState = initializeGrid();
	const firstCell = rowMajorCells(gridState)[0];
	firstCell.fillNumber = digit;
	firstCell.isClue = true;
	return createPuzzleDefinition(gridState);
}

async function openPuzzle(page: Page) {
	await page.goto('/', { waitUntil: 'domcontentloaded' });
	await page.locator('.sudoku-cell').first().waitFor({ state: 'visible' });
	await page.waitForLoadState('networkidle');
}

async function openSettings(page: Page, wide = false) {
	if (!wide) await page.getByText('Info', { exact: true }).click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
}

async function beginSolve(page: Page) {
	await page.getByRole('button', { name: 'Start solving', exact: true }).click();
	await page
		.getByRole('dialog', { name: 'Start solving?' })
		.getByRole('button', { name: 'Start solving', exact: true })
		.click();
}

test('round-trips only the versioned puzzle definition through a separately versioned URL codec', () => {
	const gridState = initializeGrid();
	const cells = rowMajorCells(gridState);
	cells[0].fillNumber = 5;
	cells[0].isClue = true;
	cells[1].fillNumber = 3;
	cells[1].isClue = false;
	cells[2].manuallyAddedCandidates[5] = true;
	cells[2].crossedOutCandidates[3] = true;
	cells[2].boldCandidates[0] = true;

	const definition = createPuzzleDefinition(gridState);
	const result = createShareUrl('https://example.com/sudoku/?source=paper#old', definition);
	expect(result.ok).toBe(true);
	if (!result.ok) return;

	const url = new URL(result.value);
	expect(url.origin + url.pathname + url.search).toBe('https://example.com/sudoku/?source=paper');
	expect(url.hash).toMatch(/^#p=2\.[A-Za-z0-9_-]+$/);
	expect(url.hash.length).toBeLessThan(250);

	const [codecVersion, encodedDefinition] = url.hash.slice(3).split('.');
	expect(Number(codecVersion)).toBe(shareLinkCodecVersion);
	const serializedDefinition = new TextDecoder().decode(
		inflate(decodeBase64Url(encodedDefinition))
	);
	const sharedDefinition = JSON.parse(serializedDefinition) as Record<string, unknown>;
	expect(Object.keys(sharedDefinition).sort()).toEqual(['clues', 'format', 'version']);
	expect(sharedDefinition).toMatchObject({
		version: puzzleDefinitionVersion,
		clues: expect.any(Array)
	});

	const decoded = decodeSharedPuzzleFragment(url.hash);
	expect(decoded.kind).toBe('success');
	if (decoded.kind !== 'success') return;

	const restoredCells = rowMajorCells(decoded.puzzle.gridState);
	expect(decoded.puzzle).toMatchObject({ puzzlePhase: 'setup', elapsedMilliseconds: 0 });
	expect(restoredCells[0]).toMatchObject({ fillNumber: 5, isClue: true });
	expect(restoredCells[1]).toMatchObject({ fillNumber: null, isClue: false });
	expect(restoredCells[2].manuallyAddedCandidates).not.toContain(true);
	expect(restoredCells[2].crossedOutCandidates).not.toContain(true);
	expect(restoredCells[2].boldCandidates).not.toContain(true);
});

test('strictly rejects corrupt, unsupported, ambiguous, and oversized fragments', () => {
	const definition = serializePuzzleDefinition(definitionWithClue(5));
	const unsupportedDefinition = JSON.stringify({
		...(JSON.parse(definition) as Record<string, unknown>),
		version: puzzleDefinitionVersion + 1
	});

	expect(decodeSharedPuzzleFragment('')).toEqual({ kind: 'none' });
	expect(decodeSharedPuzzleFragment('#section')).toEqual({ kind: 'none' });
	expect(decodeSharedPuzzleFragment('#p=not_json')).toMatchObject({
		kind: 'error',
		error: { code: 'invalid-data' }
	});
	expect(
		decodeSharedPuzzleFragment(`#p=${compressedPayload(definition)}&unexpected=value`)
	).toMatchObject({ kind: 'error', error: { code: 'invalid-data' } });
	expect(
		decodeSharedPuzzleFragment(`#p=${compressedPayload(definition, shareLinkCodecVersion + 1)}`)
	).toMatchObject({ kind: 'error', error: { code: 'unsupported-version' } });
	expect(
		decodeSharedPuzzleFragment(`#p=${compressedPayload(unsupportedDefinition)}`)
	).toMatchObject({
		kind: 'error',
		error: { code: 'unsupported-version' }
	});
	expect(decodeSharedPuzzleFragment(`#p=${legacyEnvelope(definition)}`)).toMatchObject({
		kind: 'error',
		error: { code: 'invalid-data' }
	});
	const expansionBomb = compressedPayload('x'.repeat(maximumDecompressedDefinitionLength + 1));
	expect(expansionBomb.length).toBeLessThan(maximumSharePayloadLength);
	expect(decodeSharedPuzzleFragment(`#p=${expansionBomb}`)).toMatchObject({
		kind: 'error',
		error: { code: 'payload-too-large' }
	});
	expect(
		decodeSharedPuzzleFragment(`#p=${'a'.repeat(maximumSharePayloadLength + 1)}`)
	).toMatchObject({ kind: 'error', error: { code: 'payload-too-large' } });
});

test('generates and copies a link that opens as a fresh persisted Setup puzzle', async ({
	page,
	browser,
	baseURL
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async (value: string) => {
					(window as typeof window & { copiedShareUrl?: string }).copiedShareUrl = value;
				}
			}
		});
	});
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);

	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	await cells.nth(10).click();
	await page.keyboard.press('7');
	await beginSolve(page);
	await cells.nth(1).click();
	await page.keyboard.press('3');
	await cells.nth(2).click();
	await page.locator('.keypad label[title="Crossout candidate"]').click();
	await page.keyboard.press('4');

	await openSettings(page);
	await page.getByRole('button', { name: 'Share puzzle', exact: true }).click();
	const shareDialog = page.getByRole('dialog', { name: 'Share puzzle' });
	const shareInput = shareDialog.getByLabel('Share URL');
	await expect(shareInput).toHaveAttribute('readonly', '');
	const shareUrl = await shareInput.inputValue();
	expect(new URL(shareUrl).hash).toMatch(/^#p=2\.[A-Za-z0-9_-]+$/);

	await shareDialog.getByRole('button', { name: 'Copy link' }).click();
	await expect(shareDialog.getByRole('status')).toHaveText('Share link copied.');
	expect(
		await page.evaluate(
			() => (window as typeof window & { copiedShareUrl?: string }).copiedShareUrl
		)
	).toBe(shareUrl);

	const sharedContext = await browser.newContext({ baseURL });
	const sharedPage = await sharedContext.newPage();
	await sharedPage.goto(shareUrl, { waitUntil: 'domcontentloaded' });
	const sharedCells = sharedPage.locator('.sudoku-cell');
	await sharedCells.first().waitFor({ state: 'visible' });
	await expect(sharedPage.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(sharedPage.getByRole('dialog', { name: 'Open shared puzzle?' })).toHaveCount(0);
	await expect(sharedCells.nth(0).locator('.value')).toHaveText('5');
	await expect(sharedCells.nth(10).locator('.value')).toHaveText('7');
	await expect(sharedCells.nth(1).locator('.value')).toHaveCount(0);
	expect(new URL(sharedPage.url()).hash).toBe('');

	const stored = await sharedPage.evaluate(
		(storageKey) => localStorage.getItem(storageKey),
		currentPuzzleStorageKey
	);
	expect(stored).not.toBeNull();
	const storedEnvelope = JSON.parse(stored ?? '{}') as {
		puzzleDefinition: string;
		solveSession: string;
	};
	expect(JSON.parse(storedEnvelope.puzzleDefinition).clues).toEqual(
		Array.from({ length: 81 }, (_, index) => (index === 0 ? 5 : index === 10 ? 7 : null))
	);
	expect(JSON.parse(storedEnvelope.solveSession)).toMatchObject({
		phase: 'setup',
		elapsedMilliseconds: 0,
		entries: Array.from({ length: 81 }, () => null),
		annotations: []
	});
	await sharedContext.close();
});

test('requires confirmation before replacing a meaningful local session', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);
	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	const storedBefore = await page.evaluate(
		(storageKey) => localStorage.getItem(storageKey),
		currentPuzzleStorageKey
	);
	expect(storedBefore).not.toBeNull();

	const incoming = createShareUrl(page.url(), definitionWithClue(8));
	expect(incoming.ok).toBe(true);
	if (!incoming.ok) return;

	await page.goto(incoming.value, { waitUntil: 'domcontentloaded' });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	const replaceDialog = page.getByRole('dialog', { name: 'Open shared puzzle?' });
	await expect(replaceDialog).toBeVisible();
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	expect(await page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey)).toBe(
		storedBefore
	);

	await replaceDialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(cells.nth(0).locator('.value')).toHaveText('5');
	expect(new URL(page.url()).hash).toBe('');
	expect(await page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey)).toBe(
		storedBefore
	);

	await page.goto(incoming.value, { waitUntil: 'domcontentloaded' });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await cells.first().waitFor({ state: 'visible' });
	await replaceDialog.getByRole('button', { name: 'Open shared puzzle', exact: true }).click();
	await expect(page.locator('.app-container')).toHaveAttribute('data-puzzle-phase', 'setup');
	await expect(cells.nth(0).locator('.value')).toHaveText('8');
	expect(new URL(page.url()).hash).toBe('');

	const storedAfter = await page.evaluate(
		(storageKey) => localStorage.getItem(storageKey),
		currentPuzzleStorageKey
	);
	expect(storedAfter).not.toBe(storedBefore);
	expect(JSON.parse(JSON.parse(storedAfter ?? '{}').puzzleDefinition).clues[0]).toBe(8);
});

test('reports invalid, unsupported, and oversized links without mutating current state', async ({
	page
}) => {
	await page.setViewportSize({ width: 1400, height: 1000 });
	await openPuzzle(page);
	const cells = page.locator('.sudoku-cell');
	await cells.nth(0).click();
	await page.keyboard.press('5');
	const storedBefore = await page.evaluate(
		(storageKey) => localStorage.getItem(storageKey),
		currentPuzzleStorageKey
	);
	const definition = serializePuzzleDefinition(definitionWithClue(8));
	const cases = [
		{ hash: '#p=not_json', message: 'invalid or damaged' },
		{
			hash: `#p=${compressedPayload(definition, shareLinkCodecVersion + 1)}`,
			message: 'does not support'
		},
		{
			hash: `#p=${'a'.repeat(maximumSharePayloadLength + 1)}`,
			message: 'too large'
		}
	];

	for (const invalidCase of cases) {
		await page.goto(`/${invalidCase.hash}`, { waitUntil: 'domcontentloaded' });
		await page.reload({ waitUntil: 'domcontentloaded' });
		await cells.first().waitFor({ state: 'visible' });
		const errorDialog = page.getByRole('dialog', { name: 'Could not open share link' });
		await expect(errorDialog).toContainText(invalidCase.message);
		await expect(cells.nth(0).locator('.value')).toHaveText('5');
		expect(await page.evaluate((key) => localStorage.getItem(key), currentPuzzleStorageKey)).toBe(
			storedBefore
		);
		await errorDialog.getByRole('button', { name: 'OK' }).click();
		expect(new URL(page.url()).hash).toBe('');
	}
});

for (const layout of [
	{ name: 'wide', width: 1920, height: 1080, className: 'layout-wide' },
	{ name: 'side', width: 844, height: 390, className: 'layout-side' },
	{ name: 'stacked phone', width: 390, height: 844, className: 'layout-stacked' }
]) {
	test(`share dialog fits the ${layout.name} layout`, async ({ page }) => {
		await page.setViewportSize({ width: layout.width, height: layout.height });
		await openPuzzle(page);
		await expect(page.locator('.app-container')).toHaveClass(new RegExp(layout.className));
		await openSettings(page, layout.className === 'layout-wide');
		await page.getByRole('button', { name: 'Share puzzle', exact: true }).click();

		const dialog = page.getByRole('dialog', { name: 'Share puzzle' });
		const dialogBounds = await dialog.boundingBox();
		const inputBounds = await dialog.getByLabel('Share URL').boundingBox();
		expect(dialogBounds).not.toBeNull();
		expect(inputBounds).not.toBeNull();
		if (!dialogBounds || !inputBounds) return;
		expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
		expect(dialogBounds.y).toBeGreaterThanOrEqual(0);
		expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(layout.width + 1);
		expect(dialogBounds.y + dialogBounds.height).toBeLessThanOrEqual(layout.height + 1);
		expect(inputBounds.x).toBeGreaterThanOrEqual(dialogBounds.x);
		expect(inputBounds.x + inputBounds.width).toBeLessThanOrEqual(
			dialogBounds.x + dialogBounds.width
		);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
		).toBe(false);
	});
}

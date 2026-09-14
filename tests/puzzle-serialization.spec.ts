import { expect, test } from '@playwright/test';
import { initializeGrid, type Cell } from '../src/lib/gridUtils';
import { calculateElapsedMilliseconds } from '../src/lib/puzzleLifecycle';
import {
	createPuzzleDefinition,
	createSolveSession,
	deserializePuzzleState,
	germanWhispersPuzzleDefinitionVersion,
	parsePuzzleDefinition,
	parseSolveSession,
	puzzleDefinitionFormat,
	puzzleDefinitionVersion,
	serializePuzzleDefinition,
	serializePuzzleState,
	serializeSolveSession,
	solveSessionFormat,
	solveSessionVersion
} from '../src/lib/puzzleSerialization';

const candidateDigits = [7, 8, 9, 4, 5, 6, 1, 2, 3];
const standardSolution =
	'534678912672195348198342567859761423426853791713924856961537284287419635345286179';

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

function setCellValue(cell: Cell, value: number, isClue: boolean) {
	cell.fillNumber = value;
	cell.isClue = isClue;
}

function setCandidateFlag(flags: boolean[], digit: number) {
	flags[candidateDigits.indexOf(digit)] = true;
}

test('round-trips a versioned puzzle definition without solver or runtime state', () => {
	const gridState = initializeGrid();
	const cells = rowMajorCells(gridState);
	setCellValue(cells[0], 5, true);
	setCellValue(cells[10], 7, true);
	setCellValue(cells[20], 4, false);
	cells[0].isSelected = true;
	cells[0].width = 72;
	cells[0].height = 72;
	cells[0].element = { id: 'runtime-only' } as HTMLElement;
	cells[0].candidates.fill(false);

	const germanWhisperLines = [[0, 10, 11]];
	const definition = createPuzzleDefinition(gridState, germanWhisperLines);
	const serialized = serializePuzzleDefinition(definition);
	const parsed = parsePuzzleDefinition(serialized);

	expect(parsed).toEqual({ ok: true, value: definition });
	expect(JSON.parse(serialized)).toEqual({
		format: puzzleDefinitionFormat,
		version: puzzleDefinitionVersion,
		clues: Array.from({ length: 81 }, (_, index) => (index === 0 ? 5 : index === 10 ? 7 : null)),
		constraints: { germanWhispers: germanWhisperLines, killerCages: [] }
	});
	for (const runtimeField of [
		'fillNumber',
		'isClue',
		'candidates',
		'isSelected',
		'width',
		'height',
		'element',
		'rowNumber0based'
	]) {
		expect(serialized).not.toContain(runtimeField);
	}
});

test('round-trips entries, candidate annotations, phase, and current active time', () => {
	const gridState = initializeGrid();
	const cells = rowMajorCells(gridState);
	setCellValue(cells[0], 5, true);
	setCellValue(cells[1], 3, false);
	setCandidateFlag(cells[2].manuallyAddedCandidates, 4);
	setCandidateFlag(cells[2].crossedOutCandidates, 7);
	setCandidateFlag(cells[2].boldCandidates, 8);
	cells[2].isSelected = true;
	cells[2].width = 64;
	cells[2].height = 64;

	const elapsedMilliseconds = calculateElapsedMilliseconds(1_200, 500, 800);
	const serialized = serializePuzzleState(gridState, 'solving', elapsedMilliseconds);
	const parsedSession = parseSolveSession(serialized.solveSession);
	const restored = deserializePuzzleState(serialized.puzzleDefinition, serialized.solveSession);

	expect(parsedSession).toEqual({
		ok: true,
		value: {
			format: solveSessionFormat,
			version: solveSessionVersion,
			phase: 'solving',
			elapsedMilliseconds: 1_500,
			entries: Array.from({ length: 81 }, (_, index) => (index === 1 ? 3 : null)),
			annotations: [{ cell: 2, manuallyAdded: [4], crossedOut: [7], bold: [8] }]
		}
	});
	expect(restored.ok).toBe(true);
	if (!restored.ok) return;

	const restoredCells = rowMajorCells(restored.value.gridState);
	expect(restored.value.puzzlePhase).toBe('solving');
	expect(restored.value.elapsedMilliseconds).toBe(1_500);
	expect(restored.value.germanWhisperLines).toEqual([]);
	expect(restoredCells[0]).toMatchObject({ fillNumber: 5, isClue: true });
	expect(restoredCells[1]).toMatchObject({ fillNumber: 3, isClue: false });
	expect(restoredCells[2].manuallyAddedCandidates[candidateDigits.indexOf(4)]).toBe(true);
	expect(restoredCells[2].crossedOutCandidates[candidateDigits.indexOf(7)]).toBe(true);
	expect(restoredCells[2].boldCandidates[candidateDigits.indexOf(8)]).toBe(true);
	expect(restoredCells[2].candidates[candidateDigits.indexOf(5)]).toBe(false);
	expect(restoredCells[2].isSelected).toBe(false);
	expect(restoredCells[2].width).toBe(0);
	expect(restoredCells[2].height).toBe(0);
	expect(restoredCells[2].element).toBeUndefined();

	const secondSerialization = serializePuzzleState(
		restored.value.gridState,
		restored.value.puzzlePhase,
		restored.value.elapsedMilliseconds
	);
	expect(parsePuzzleDefinition(secondSerialization.puzzleDefinition)).toEqual(
		parsePuzzleDefinition(serialized.puzzleDefinition)
	);
	expect(parseSolveSession(secondSerialization.solveSession)).toEqual(parsedSession);
	for (const runtimeField of [
		'candidates',
		'isSelected',
		'width',
		'height',
		'element',
		'activeTimerStartedAt',
		'timerUpdateId'
	]) {
		expect(serialized.solveSession).not.toContain(runtimeField);
	}
});

test('round-trips German Whispers without narrowing calculated candidates', () => {
	const gridState = initializeGrid();
	const germanWhisperLines = [
		[0, 10, 11],
		[72, 64]
	];
	const serialized = serializePuzzleState(gridState, 'setup', 0, germanWhisperLines);
	const restored = deserializePuzzleState(serialized.puzzleDefinition, serialized.solveSession);

	expect(restored.ok).toBe(true);
	if (!restored.ok) return;
	expect(restored.value.germanWhisperLines).toEqual(germanWhisperLines);

	const restoredCells = rowMajorCells(restored.value.gridState);
	const fiveIndex = candidateDigits.indexOf(5);
	for (const cellIndex of [0, 10, 11, 72, 64]) {
		expect(restoredCells[cellIndex].candidates[fiveIndex]).toBe(true);
	}
	expect(restoredCells[1].candidates[fiveIndex]).toBe(true);

	const definition = JSON.parse(serialized.puzzleDefinition) as Record<string, unknown>;
	expect(
		parsePuzzleDefinition(
			JSON.stringify({
				...definition,
				constraints: { germanWhispers: [[0, 2]], killerCages: [] }
			})
		)
	).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
});

test('restores version 2 German Whispers definitions with no killer cages', () => {
	const currentDefinition = createPuzzleDefinition(initializeGrid(), [[0, 1]]);
	const previousDefinition = {
		...currentDefinition,
		version: germanWhispersPuzzleDefinitionVersion,
		constraints: { germanWhispers: currentDefinition.constraints.germanWhispers }
	};
	const session = createSolveSession(initializeGrid(), 'setup', 0);
	const restored = deserializePuzzleState(
		JSON.stringify(previousDefinition),
		serializeSolveSession(session)
	);

	expect(restored.ok).toBe(true);
	if (!restored.ok) return;
	expect(restored.value.germanWhisperLines).toEqual([[0, 1]]);
	expect(restored.value.killerCages).toEqual([]);
});

test('round-trips valid Killer Sudoku cages and rejects disconnected or overlapping cages', () => {
	const gridState = initializeGrid();
	const killerCages = [
		{ sum: 6, cells: [0, 1, 10] },
		{ sum: 15, cells: [3, 4] }
	];
	const serialized = serializePuzzleState(gridState, 'setup', 0, [], killerCages);
	const restored = deserializePuzzleState(serialized.puzzleDefinition, serialized.solveSession);

	expect(restored.ok).toBe(true);
	if (!restored.ok) return;
	expect(restored.value.killerCages).toEqual(killerCages);

	const definition = JSON.parse(serialized.puzzleDefinition) as Record<string, unknown>;
	const constraints = (definition.constraints ?? {}) as Record<string, unknown>;
	for (const invalidCages of [
		[{ sum: 4, cells: [0, 10] }],
		[
			{ sum: 3, cells: [0, 1] },
			{ sum: 5, cells: [1, 2] }
		],
		[{ sum: 2, cells: [0, 1] }]
	]) {
		expect(
			parsePuzzleDefinition(
				JSON.stringify({
					...definition,
					constraints: { ...constraints, killerCages: invalidCages }
				})
			)
		).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
	}
});

test('restores Completed data while preserving clue-versus-entry identity', () => {
	const gridState = initializeGrid();
	const cells = rowMajorCells(gridState);
	for (const [index, digit] of [...standardSolution].entries()) {
		setCellValue(cells[index], Number(digit), index % 4 === 0);
	}

	const serialized = serializePuzzleState(gridState, 'completed', 123_456.75);
	const restored = deserializePuzzleState(serialized.puzzleDefinition, serialized.solveSession);

	expect(restored.ok).toBe(true);
	if (!restored.ok) return;
	const restoredCells = rowMajorCells(restored.value.gridState);
	expect(restored.value.puzzlePhase).toBe('completed');
	expect(restored.value.elapsedMilliseconds).toBe(123_456.75);
	for (const [index, cell] of restoredCells.entries()) {
		expect(cell.fillNumber).toBe(Number(standardSolution[index]));
		expect(cell.isClue).toBe(index % 4 === 0);
	}
});

test('rejects malformed, unsupported, and inconsistent data atomically', () => {
	const emptyGrid = initializeGrid();
	const definition = createPuzzleDefinition(emptyGrid);
	const session = createSolveSession(emptyGrid, 'setup', 0);
	const serializedDefinition = serializePuzzleDefinition(definition);
	const serializedSession = serializeSolveSession(session);

	expect(parsePuzzleDefinition('{')).toMatchObject({
		ok: false,
		error: { code: 'invalid-json' }
	});
	expect(
		parsePuzzleDefinition(JSON.stringify({ ...definition, version: puzzleDefinitionVersion + 1 }))
	).toMatchObject({ ok: false, error: { code: 'unsupported-version' } });
	expect(
		parseSolveSession(JSON.stringify({ ...session, version: solveSessionVersion + 1 }))
	).toMatchObject({ ok: false, error: { code: 'unsupported-version' } });
	expect(parsePuzzleDefinition(JSON.stringify({ ...definition, width: 900 }))).toMatchObject({
		ok: false,
		error: { code: 'invalid-data' }
	});
	expect(
		parsePuzzleDefinition(JSON.stringify({ ...definition, clues: definition.clues.slice(1) }))
	).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
	expect(
		parseSolveSession(
			JSON.stringify({
				...session,
				annotations: [{ cell: 0, manuallyAdded: [10], crossedOut: [], bold: [] }]
			})
		)
	).toMatchObject({ ok: false, error: { code: 'invalid-data' } });

	const overlappingEntries = [...session.entries];
	overlappingEntries[0] = 4;
	const inconsistentDefinition = {
		...definition,
		clues: definition.clues.map((clue, index) => (index === 0 ? 5 : clue))
	};
	const sourceBeforeFailure = JSON.stringify(emptyGrid);
	const overlapResult = deserializePuzzleState(
		serializePuzzleDefinition(inconsistentDefinition),
		serializeSolveSession({ ...session, phase: 'solving', entries: overlappingEntries })
	);
	expect(overlapResult).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
	expect('value' in overlapResult).toBe(false);
	expect(JSON.stringify(emptyGrid)).toBe(sourceBeforeFailure);

	const invalidSessionResult = deserializePuzzleState(serializedDefinition, '{');
	expect(invalidSessionResult).toMatchObject({
		ok: false,
		error: { code: 'invalid-json' }
	});
	expect('value' in invalidSessionResult).toBe(false);
	expect(JSON.stringify(emptyGrid)).toBe(sourceBeforeFailure);

	const incompleteCompletedResult = deserializePuzzleState(
		serializedDefinition,
		serializeSolveSession({ ...session, phase: 'completed' })
	);
	expect(incompleteCompletedResult).toMatchObject({
		ok: false,
		error: { code: 'invalid-data' }
	});
	expect(serializedSession).toContain('"phase":"setup"');
});

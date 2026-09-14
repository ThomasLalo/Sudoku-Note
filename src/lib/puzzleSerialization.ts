import type { Cell } from './gridUtils';
import { initializeGrid } from './gridUtils';
import {
	areGermanWhispersComplete,
	isGermanWhisperLine,
	type GermanWhisperLine
} from './germanWhispers';
import {
	areKillerCagesComplete,
	isKillerCage,
	killerCagesAreDisjoint,
	type KillerCage
} from './killerCages';
import { isStandardSudokuComplete } from './puzzleLifecycle';

const sudokuSize = 9;
const cellCount = sudokuSize * sudokuSize;
const candidateDigits = [7, 8, 9, 4, 5, 6, 1, 2, 3] as const;

export const puzzleDefinitionFormat = 'sudoku-note-puzzle-definition';
export const solveSessionFormat = 'sudoku-note-solve-session';
export const legacyPuzzleDefinitionVersion = 1;
export const germanWhispersPuzzleDefinitionVersion = 2;
export const puzzleDefinitionVersion = 3;
export const solveSessionVersion = 1;

export type PuzzlePhase = 'setup' | 'solving' | 'completed';
type CellValue = number | null;

export interface PuzzleDefinitionV1 {
	format: typeof puzzleDefinitionFormat;
	version: typeof legacyPuzzleDefinitionVersion;
	clues: CellValue[];
}

export interface PuzzleDefinitionV2 {
	format: typeof puzzleDefinitionFormat;
	version: typeof germanWhispersPuzzleDefinitionVersion;
	clues: CellValue[];
	constraints: {
		germanWhispers: GermanWhisperLine[];
	};
}

export interface PuzzleDefinitionV3 {
	format: typeof puzzleDefinitionFormat;
	version: typeof puzzleDefinitionVersion;
	clues: CellValue[];
	constraints: {
		germanWhispers: GermanWhisperLine[];
		killerCages: KillerCage[];
	};
}

export type PuzzleDefinition = PuzzleDefinitionV1 | PuzzleDefinitionV2 | PuzzleDefinitionV3;

export interface CandidateAnnotationsV1 {
	cell: number;
	manuallyAdded: number[];
	crossedOut: number[];
	bold: number[];
}

export interface SolveSessionV1 {
	format: typeof solveSessionFormat;
	version: typeof solveSessionVersion;
	phase: PuzzlePhase;
	elapsedMilliseconds: number;
	entries: CellValue[];
	annotations: CandidateAnnotationsV1[];
}

export interface SerializedPuzzleState {
	puzzleDefinition: string;
	solveSession: string;
}

export interface RestoredPuzzleState {
	gridState: Cell[][];
	germanWhisperLines: GermanWhisperLine[];
	killerCages: KillerCage[];
	puzzlePhase: PuzzlePhase;
	elapsedMilliseconds: number;
}

export type SerializationErrorCode = 'invalid-json' | 'invalid-data' | 'unsupported-version';

export type ParseResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: { code: SerializationErrorCode; message: string } };

const success = <T>(value: T): ParseResult<T> => ({ ok: true, value });

const failure = <T>(code: SerializationErrorCode, message: string): ParseResult<T> => ({
	ok: false,
	error: { code, message }
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
	const actualKeys = Object.keys(value).sort();
	const expectedKeys = [...keys].sort();
	return (
		actualKeys.length === expectedKeys.length &&
		actualKeys.every((key, index) => key === expectedKeys[index])
	);
}

function isCellValue(value: unknown): value is CellValue {
	return value === null || (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 9);
}

function isCellValues(value: unknown): value is CellValue[] {
	return Array.isArray(value) && value.length === cellCount && value.every(isCellValue);
}

function isCandidateDigits(value: unknown): value is number[] {
	return (
		Array.isArray(value) &&
		value.every((digit) => Number.isInteger(digit) && digit >= 1 && digit <= 9) &&
		new Set(value).size === value.length
	);
}

function isCandidateAnnotations(value: unknown): value is CandidateAnnotationsV1[] {
	if (!Array.isArray(value)) return false;

	const annotatedCells = new Set<number>();
	for (const annotation of value) {
		if (
			!isRecord(annotation) ||
			!hasExactKeys(annotation, ['cell', 'manuallyAdded', 'crossedOut', 'bold']) ||
			!Number.isInteger(annotation.cell) ||
			Number(annotation.cell) < 0 ||
			Number(annotation.cell) >= cellCount ||
			annotatedCells.has(Number(annotation.cell)) ||
			!isCandidateDigits(annotation.manuallyAdded) ||
			!isCandidateDigits(annotation.crossedOut) ||
			!isCandidateDigits(annotation.bold)
		) {
			return false;
		}
		annotatedCells.add(Number(annotation.cell));
	}

	return true;
}

function parseJson(input: string, label: string): ParseResult<unknown> {
	try {
		return success(JSON.parse(input));
	} catch {
		return failure('invalid-json', `${label} is not valid JSON.`);
	}
}

export function parsePuzzleDefinition(input: string): ParseResult<PuzzleDefinition> {
	const parsed = parseJson(input, 'Puzzle definition');
	if (!parsed.ok) return parsed;

	const value = parsed.value;
	if (!isRecord(value) || value.format !== puzzleDefinitionFormat) {
		return failure('invalid-data', 'Puzzle definition has an invalid format.');
	}
	if (
		Number.isInteger(value.version) &&
		value.version !== legacyPuzzleDefinitionVersion &&
		value.version !== germanWhispersPuzzleDefinitionVersion &&
		value.version !== puzzleDefinitionVersion
	) {
		return failure(
			'unsupported-version',
			`Puzzle definition version ${value.version} is not supported.`
		);
	}
	if (value.version === legacyPuzzleDefinitionVersion) {
		if (!hasExactKeys(value, ['format', 'version', 'clues']) || !isCellValues(value.clues)) {
			return failure('invalid-data', 'Puzzle definition contains invalid data.');
		}
		return success(value as unknown as PuzzleDefinitionV1);
	}

	if (value.version === germanWhispersPuzzleDefinitionVersion) {
		if (
			!hasExactKeys(value, ['format', 'version', 'clues', 'constraints']) ||
			!isCellValues(value.clues) ||
			!isRecord(value.constraints) ||
			!hasExactKeys(value.constraints, ['germanWhispers']) ||
			!Array.isArray(value.constraints.germanWhispers) ||
			!value.constraints.germanWhispers.every(isGermanWhisperLine)
		) {
			return failure('invalid-data', 'Puzzle definition contains invalid data.');
		}
		return success(value as unknown as PuzzleDefinitionV2);
	}

	if (
		value.version !== puzzleDefinitionVersion ||
		!hasExactKeys(value, ['format', 'version', 'clues', 'constraints']) ||
		!isCellValues(value.clues) ||
		!isRecord(value.constraints) ||
		!hasExactKeys(value.constraints, ['germanWhispers', 'killerCages']) ||
		!Array.isArray(value.constraints.germanWhispers) ||
		!value.constraints.germanWhispers.every(isGermanWhisperLine) ||
		!Array.isArray(value.constraints.killerCages) ||
		!value.constraints.killerCages.every(isKillerCage) ||
		!killerCagesAreDisjoint(value.constraints.killerCages)
	) {
		return failure('invalid-data', 'Puzzle definition contains invalid data.');
	}

	return success(value as unknown as PuzzleDefinitionV3);
}

export function parseSolveSession(input: string): ParseResult<SolveSessionV1> {
	const parsed = parseJson(input, 'Solve session');
	if (!parsed.ok) return parsed;

	const value = parsed.value;
	if (!isRecord(value) || value.format !== solveSessionFormat) {
		return failure('invalid-data', 'Solve session has an invalid format.');
	}
	if (Number.isInteger(value.version) && value.version !== solveSessionVersion) {
		return failure(
			'unsupported-version',
			`Solve session version ${value.version} is not supported.`
		);
	}
	if (
		value.version !== solveSessionVersion ||
		!hasExactKeys(value, [
			'format',
			'version',
			'phase',
			'elapsedMilliseconds',
			'entries',
			'annotations'
		]) ||
		!['setup', 'solving', 'completed'].includes(String(value.phase)) ||
		typeof value.elapsedMilliseconds !== 'number' ||
		!Number.isFinite(value.elapsedMilliseconds) ||
		value.elapsedMilliseconds < 0 ||
		!isCellValues(value.entries) ||
		!isCandidateAnnotations(value.annotations)
	) {
		return failure('invalid-data', 'Solve session contains invalid data.');
	}

	return success(value as unknown as SolveSessionV1);
}

function getRowMajorCells(gridState: readonly (readonly Cell[])[]) {
	const cellsByPosition = new Map<number, Cell>();
	for (const cell of gridState.flat()) {
		const row = cell.rowNumber0based;
		const column = cell.colNumber0based;
		const position = row * sudokuSize + column;
		if (
			!Number.isInteger(row) ||
			!Number.isInteger(column) ||
			row < 0 ||
			row >= sudokuSize ||
			column < 0 ||
			column >= sudokuSize ||
			cellsByPosition.has(position)
		) {
			throw new Error('Cannot serialize an invalid live grid.');
		}
		cellsByPosition.set(position, cell);
	}

	if (cellsByPosition.size !== cellCount) {
		throw new Error('Cannot serialize an invalid live grid.');
	}

	const cells = Array.from({ length: cellCount }, (_, position) => cellsByPosition.get(position)!);
	if (cells.some((cell) => !isCellValue(cell.fillNumber) || typeof cell.isClue !== 'boolean')) {
		throw new Error('Cannot serialize invalid live cell values.');
	}

	return cells;
}

function enabledCandidateDigits(flags: readonly boolean[]) {
	if (flags.length !== candidateDigits.length || flags.some((flag) => typeof flag !== 'boolean')) {
		throw new Error('Cannot serialize invalid candidate annotations.');
	}

	return candidateDigits.filter((_, index) => flags[index]).sort((a, b) => a - b);
}

export function createPuzzleDefinition(
	gridState: readonly (readonly Cell[])[],
	germanWhisperLines: readonly GermanWhisperLine[] = [],
	killerCages: readonly KillerCage[] = []
): PuzzleDefinitionV3 {
	const cells = getRowMajorCells(gridState);
	if (!germanWhisperLines.every(isGermanWhisperLine)) {
		throw new Error('Cannot serialize invalid German Whispers lines.');
	}
	if (!killerCages.every(isKillerCage) || !killerCagesAreDisjoint(killerCages)) {
		throw new Error('Cannot serialize invalid Killer Sudoku cages.');
	}
	return {
		format: puzzleDefinitionFormat,
		version: puzzleDefinitionVersion,
		clues: cells.map((cell) => (cell.isClue ? cell.fillNumber : null)),
		constraints: {
			germanWhispers: germanWhisperLines.map((line) => [...line]),
			killerCages: killerCages.map((cage) => ({ sum: cage.sum, cells: [...cage.cells] }))
		}
	};
}

export function createSolveSession(
	gridState: readonly (readonly Cell[])[],
	phase: PuzzlePhase,
	elapsedMilliseconds: number
): SolveSessionV1 {
	if (
		!['setup', 'solving', 'completed'].includes(phase) ||
		!Number.isFinite(elapsedMilliseconds) ||
		elapsedMilliseconds < 0
	) {
		throw new Error('Cannot serialize invalid solve-session state.');
	}

	const cells = getRowMajorCells(gridState);
	const annotations = cells.flatMap<CandidateAnnotationsV1>((cell, cellIndex) => {
		const annotation = {
			cell: cellIndex,
			manuallyAdded: enabledCandidateDigits(cell.manuallyAddedCandidates),
			crossedOut: enabledCandidateDigits(cell.crossedOutCandidates),
			bold: enabledCandidateDigits(cell.boldCandidates)
		};
		return annotation.manuallyAdded.length || annotation.crossedOut.length || annotation.bold.length
			? [annotation]
			: [];
	});
	const session: SolveSessionV1 = {
		format: solveSessionFormat,
		version: solveSessionVersion,
		phase,
		elapsedMilliseconds,
		entries: cells.map((cell) => (!cell.isClue ? cell.fillNumber : null)),
		annotations
	};

	if (
		phase === 'setup' &&
		(elapsedMilliseconds !== 0 ||
			session.entries.some((entry) => entry !== null) ||
			annotations.length > 0)
	) {
		throw new Error('Cannot serialize inconsistent Setup state.');
	}

	return session;
}

export function serializePuzzleDefinition(definition: PuzzleDefinition) {
	return JSON.stringify(definition);
}

export function serializeSolveSession(session: SolveSessionV1) {
	return JSON.stringify(session);
}

/**
 * Captures serializable domain state. While a solve timer is active, callers must pass an elapsed
 * value calculated at snapshot time rather than the last display-tick value.
 */
export function serializePuzzleState(
	gridState: readonly (readonly Cell[])[],
	phase: PuzzlePhase,
	elapsedMilliseconds: number,
	germanWhisperLines: readonly GermanWhisperLine[] = [],
	killerCages: readonly KillerCage[] = []
): SerializedPuzzleState {
	return {
		puzzleDefinition: serializePuzzleDefinition(
			createPuzzleDefinition(gridState, germanWhisperLines, killerCages)
		),
		solveSession: serializeSolveSession(createSolveSession(gridState, phase, elapsedMilliseconds))
	};
}

function validateCombinedState(
	definition: PuzzleDefinition,
	session: SolveSessionV1
): ParseResult<true> {
	if (
		definition.clues.some((clue, cellIndex) => clue !== null && session.entries[cellIndex] !== null)
	) {
		return failure('invalid-data', 'A cell cannot contain both a clue and a solver entry.');
	}

	if (
		session.phase === 'setup' &&
		(session.elapsedMilliseconds !== 0 ||
			session.entries.some((entry) => entry !== null) ||
			session.annotations.length > 0)
	) {
		return failure('invalid-data', 'Setup data cannot contain solving progress.');
	}

	if (session.phase === 'completed') {
		const effectiveValues = definition.clues.map(
			(clue, cellIndex) => clue ?? session.entries[cellIndex]
		);
		const rows = Array.from({ length: sudokuSize }, (_, row) =>
			effectiveValues.slice(row * sudokuSize, (row + 1) * sudokuSize)
		);
		const germanWhisperLines =
			definition.version === legacyPuzzleDefinitionVersion
				? []
				: definition.constraints.germanWhispers;
		const killerCages =
			definition.version === puzzleDefinitionVersion ? definition.constraints.killerCages : [];
		if (
			!isStandardSudokuComplete(rows) ||
			!areGermanWhispersComplete(effectiveValues, germanWhisperLines) ||
			!areKillerCagesComplete(effectiveValues, killerCages)
		) {
			return failure('invalid-data', 'Completed data does not contain a completed Sudoku.');
		}
	}

	return success(true);
}

function setCandidateFlags(flags: boolean[], digits: readonly number[]) {
	for (const digit of digits) {
		const candidateIndex = candidateDigits.findIndex((candidate) => candidate === digit);
		flags[candidateIndex] = true;
	}
}

function recalculateCandidates(cells: readonly Cell[]) {
	for (const cell of cells) {
		const peers = cells.filter(
			(peer) =>
				peer.rowNumber0based === cell.rowNumber0based ||
				peer.colNumber0based === cell.colNumber0based ||
				peer.boxNumber === cell.boxNumber
		);
		cell.candidates = candidateDigits.map((digit) =>
			peers.every((peer) => peer.fillNumber !== digit)
		);
	}
}

function restorePuzzleState(
	definition: PuzzleDefinition,
	session: SolveSessionV1
): ParseResult<RestoredPuzzleState> {
	const combinedValidation = validateCombinedState(definition, session);
	if (!combinedValidation.ok) return combinedValidation;

	const gridState = initializeGrid();
	const cells = getRowMajorCells(gridState);
	for (const [cellIndex, cell] of cells.entries()) {
		const clue = definition.clues[cellIndex];
		cell.fillNumber = clue ?? session.entries[cellIndex];
		cell.isClue = clue !== null;
	}
	for (const annotation of session.annotations) {
		const cell = cells[annotation.cell];
		setCandidateFlags(cell.manuallyAddedCandidates, annotation.manuallyAdded);
		setCandidateFlags(cell.crossedOutCandidates, annotation.crossedOut);
		setCandidateFlags(cell.boldCandidates, annotation.bold);
	}
	const germanWhisperLines =
		definition.version === legacyPuzzleDefinitionVersion
			? []
			: definition.constraints.germanWhispers.map((line) => [...line]);
	const killerCages =
		definition.version === puzzleDefinitionVersion
			? definition.constraints.killerCages.map((cage) => ({
					sum: cage.sum,
					cells: [...cage.cells]
				}))
			: [];
	// Calculated candidates are derived from effective values and are deliberately not serialized.
	recalculateCandidates(cells);

	return success({
		gridState,
		germanWhisperLines,
		killerCages,
		puzzlePhase: session.phase,
		elapsedMilliseconds: session.elapsedMilliseconds
	});
}

export function deserializePuzzleState(
	puzzleDefinition: string,
	solveSession: string
): ParseResult<RestoredPuzzleState> {
	const parsedDefinition = parsePuzzleDefinition(puzzleDefinition);
	if (!parsedDefinition.ok) return parsedDefinition;

	const parsedSession = parseSolveSession(solveSession);
	if (!parsedSession.ok) return parsedSession;

	return restorePuzzleState(parsedDefinition.value, parsedSession.value);
}

/** Restores a validated puzzle definition as a new Setup puzzle with no private solve state. */
export function deserializePuzzleDefinition(
	puzzleDefinition: string
): ParseResult<RestoredPuzzleState> {
	const parsedDefinition = parsePuzzleDefinition(puzzleDefinition);
	if (!parsedDefinition.ok) return parsedDefinition;

	const emptySession: SolveSessionV1 = {
		format: solveSessionFormat,
		version: solveSessionVersion,
		phase: 'setup',
		elapsedMilliseconds: 0,
		entries: Array.from({ length: cellCount }, () => null),
		annotations: []
	};

	return restorePuzzleState(parsedDefinition.value, emptySession);
}

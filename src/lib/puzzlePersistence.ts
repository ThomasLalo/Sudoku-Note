import {
	deserializePuzzleState,
	type ParseResult,
	type RestoredPuzzleState,
	type SerializedPuzzleState
} from './puzzleSerialization';

export const currentPuzzleStorageKey = 'sudoku-note-current-puzzle';

function failure(message: string): ParseResult<RestoredPuzzleState> {
	return { ok: false, error: { code: 'invalid-data', message } };
}

function isStoredPuzzleState(value: unknown): value is SerializedPuzzleState {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

	const record = value as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	return (
		keys.length === 2 &&
		keys[0] === 'puzzleDefinition' &&
		keys[1] === 'solveSession' &&
		typeof record.puzzleDefinition === 'string' &&
		typeof record.solveSession === 'string'
	);
}

export function encodeStoredPuzzleState(state: SerializedPuzzleState) {
	return JSON.stringify(state);
}

export function decodeStoredPuzzleState(input: string): ParseResult<RestoredPuzzleState> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(input);
	} catch {
		return {
			ok: false,
			error: { code: 'invalid-json', message: 'Saved puzzle is not valid JSON.' }
		};
	}

	if (!isStoredPuzzleState(parsed)) {
		return failure('Saved puzzle contains incomplete or invalid data.');
	}

	return deserializePuzzleState(parsed.puzzleDefinition, parsed.solveSession);
}

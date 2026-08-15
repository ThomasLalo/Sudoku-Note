import type { ParseResult } from './puzzleSerialization';

export const userPreferencesStorageKey = 'sudoku-note-user-preferences';
export const userPreferencesFormat = 'sudoku-note-user-preferences';
export const userPreferencesVersion = 1;

export interface UserPreferences {
	format: typeof userPreferencesFormat;
	version: typeof userPreferencesVersion;
	flippedNotes: boolean;
	showLiveTimer: boolean;
	returnToRevealAfterEdits: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createUserPreferences(
	flippedNotes: boolean,
	showLiveTimer: boolean,
	returnToRevealAfterEdits: boolean
): UserPreferences {
	return {
		format: userPreferencesFormat,
		version: userPreferencesVersion,
		flippedNotes,
		showLiveTimer,
		returnToRevealAfterEdits
	};
}

export function serializeUserPreferences(preferences: UserPreferences) {
	return JSON.stringify(preferences);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]) {
	const keys = Object.keys(value).sort();
	return (
		keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index])
	);
}

function hasBooleanPreferenceValues(value: Record<string, unknown>) {
	return (
		typeof value.flippedNotes === 'boolean' &&
		typeof value.showLiveTimer === 'boolean' &&
		typeof value.returnToRevealAfterEdits === 'boolean'
	);
}

export function parseUserPreferences(input: string): ParseResult<UserPreferences> {
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		return {
			ok: false,
			error: { code: 'invalid-json', message: 'Saved user preferences are not valid JSON.' }
		};
	}

	if (!isRecord(value) || value.format !== userPreferencesFormat) {
		return {
			ok: false,
			error: { code: 'invalid-data', message: 'Saved user preferences have an invalid format.' }
		};
	}
	if (Number.isInteger(value.version) && value.version !== userPreferencesVersion) {
		return {
			ok: false,
			error: {
				code: 'unsupported-version',
				message: `Saved user preferences version ${value.version} is not supported.`
			}
		};
	}

	const isValidPreferences =
		value.version === userPreferencesVersion &&
		hasExactKeys(value, [
			'flippedNotes',
			'format',
			'returnToRevealAfterEdits',
			'showLiveTimer',
			'version'
		]) &&
		hasBooleanPreferenceValues(value);
	if (!isValidPreferences) {
		return {
			ok: false,
			error: { code: 'invalid-data', message: 'Saved user preferences contain invalid data.' }
		};
	}

	return { ok: true, value: value as unknown as UserPreferences };
}

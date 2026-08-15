import {
	deserializePuzzleDefinition,
	parsePuzzleDefinition,
	serializePuzzleDefinition,
	type PuzzleDefinitionV1,
	type RestoredPuzzleState
} from './puzzleSerialization';

export const shareLinkFormat = 'sudoku-note-share-link';
export const shareLinkCodecVersion = 1;
export const maximumSharePayloadLength = 4_096;

interface ShareEnvelopeV1 {
	format: typeof shareLinkFormat;
	version: typeof shareLinkCodecVersion;
	puzzleDefinition: string;
}

export type ShareLinkErrorCode = 'invalid-data' | 'unsupported-version' | 'payload-too-large';

export type ShareResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: { code: ShareLinkErrorCode; message: string } };

export type SharedPuzzleFragmentResult =
	| { kind: 'none' }
	| { kind: 'success'; puzzle: RestoredPuzzleState }
	| { kind: 'error'; error: { code: ShareLinkErrorCode; message: string } };

const invalidLinkMessage =
	'This share link is invalid or damaged. Your current puzzle was not changed.';
const unsupportedLinkMessage =
	'This share link uses a version that this copy of Sudoku Note does not support. Your current puzzle was not changed.';
const oversizedLinkMessage =
	'This share link is too large to open safely. Your current puzzle was not changed.';

function success<T>(value: T): ShareResult<T> {
	return { ok: true, value };
}

function failure<T>(code: ShareLinkErrorCode, message: string): ShareResult<T> {
	return { ok: false, error: { code, message } };
}

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

function encodeBase64Url(value: string) {
	const bytes = new TextEncoder().encode(value);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): ShareResult<string> {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) {
		return failure('invalid-data', invalidLinkMessage);
	}

	try {
		const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
		const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
		const binary = atob(paddedBase64);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return success(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
	} catch {
		return failure('invalid-data', invalidLinkMessage);
	}
}

function encodeSharePayload(definition: PuzzleDefinitionV1): ShareResult<string> {
	const puzzleDefinition = serializePuzzleDefinition(definition);
	if (!parsePuzzleDefinition(puzzleDefinition).ok) {
		return failure('invalid-data', 'This puzzle contains data that cannot be shared.');
	}

	const envelope: ShareEnvelopeV1 = {
		format: shareLinkFormat,
		version: shareLinkCodecVersion,
		puzzleDefinition
	};
	const payload = encodeBase64Url(JSON.stringify(envelope));
	if (payload.length > maximumSharePayloadLength) {
		return failure('payload-too-large', 'This puzzle is too large to share in a reliable link.');
	}

	return success(payload);
}

export function createShareUrl(
	currentUrl: string,
	definition: PuzzleDefinitionV1
): ShareResult<string> {
	const payload = encodeSharePayload(definition);
	if (!payload.ok) return payload;

	try {
		const url = new URL(currentUrl);
		url.hash = `p=${payload.value}`;
		return success(url.toString());
	} catch {
		return failure('invalid-data', 'A share URL could not be created for this page.');
	}
}

export function decodeSharedPuzzleFragment(fragment: string): SharedPuzzleFragmentResult {
	const rawFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
	if (!rawFragment) return { kind: 'none' };

	const parameters = new URLSearchParams(rawFragment);
	if (!parameters.has('p')) return { kind: 'none' };
	if (rawFragment.length > maximumSharePayloadLength + 2) {
		return { kind: 'error', error: { code: 'payload-too-large', message: oversizedLinkMessage } };
	}

	const entries = [...parameters.entries()];
	if (entries.length !== 1 || entries[0][0] !== 'p' || entries[0][1].length === 0) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	const payload = entries[0][1];
	if (payload.length > maximumSharePayloadLength) {
		return { kind: 'error', error: { code: 'payload-too-large', message: oversizedLinkMessage } };
	}

	const decoded = decodeBase64Url(payload);
	if (!decoded.ok) return { kind: 'error', error: decoded.error };

	let envelope: unknown;
	try {
		envelope = JSON.parse(decoded.value);
	} catch {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	if (!isRecord(envelope) || envelope.format !== shareLinkFormat) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}
	if (Number.isInteger(envelope.version) && envelope.version !== shareLinkCodecVersion) {
		return {
			kind: 'error',
			error: { code: 'unsupported-version', message: unsupportedLinkMessage }
		};
	}
	if (
		envelope.version !== shareLinkCodecVersion ||
		!hasExactKeys(envelope, ['format', 'version', 'puzzleDefinition']) ||
		typeof envelope.puzzleDefinition !== 'string'
	) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	const restored = deserializePuzzleDefinition(envelope.puzzleDefinition);
	if (!restored.ok) {
		return restored.error.code === 'unsupported-version'
			? {
					kind: 'error',
					error: { code: 'unsupported-version', message: unsupportedLinkMessage }
				}
			: { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	return { kind: 'success', puzzle: restored.value };
}

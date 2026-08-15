import { deflate, Inflate } from 'pako';
import {
	deserializePuzzleDefinition,
	parsePuzzleDefinition,
	serializePuzzleDefinition,
	type PuzzleDefinitionV1,
	type RestoredPuzzleState
} from './puzzleSerialization';

export const shareLinkCodecVersion = 2;
export const maximumSharePayloadLength = 4_096;
export const maximumDecompressedDefinitionLength = 64 * 1_024;

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
const oversizedExpandedLinkMessage =
	'This share link expands beyond the safe puzzle-size limit. Your current puzzle was not changed.';

function success<T>(value: T): ShareResult<T> {
	return { ok: true, value };
}

function failure<T>(code: ShareLinkErrorCode, message: string): ShareResult<T> {
	return { ok: false, error: { code, message } };
}

function encodeBase64Url(bytes: Uint8Array) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): ShareResult<Uint8Array> {
	if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
		return failure('invalid-data', invalidLinkMessage);
	}

	try {
		const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
		const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
		const binary = atob(paddedBase64);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return encodeBase64Url(bytes) === value
			? success(bytes)
			: failure('invalid-data', invalidLinkMessage);
	} catch {
		return failure('invalid-data', invalidLinkMessage);
	}
}

function decompressDefinition(compressed: Uint8Array): ShareResult<string> {
	const inflator = new Inflate({ chunkSize: 4_096 });
	const chunks: Uint8Array[] = [];
	let decompressedLength = 0;
	let exceededLimit = false;

	inflator.onData = (chunk) => {
		decompressedLength += chunk.length;
		if (decompressedLength > maximumDecompressedDefinitionLength) {
			exceededLimit = true;
			throw new Error('Decompressed share payload exceeded its limit.');
		}
		chunks.push(chunk);
	};

	try {
		const completed = inflator.push(compressed, true);
		if (!completed || inflator.err) return failure('invalid-data', invalidLinkMessage);
	} catch {
		return exceededLimit
			? failure('payload-too-large', oversizedExpandedLinkMessage)
			: failure('invalid-data', invalidLinkMessage);
	}

	const decompressed = new Uint8Array(decompressedLength);
	let offset = 0;
	for (const chunk of chunks) {
		decompressed.set(chunk, offset);
		offset += chunk.length;
	}

	try {
		return success(new TextDecoder('utf-8', { fatal: true }).decode(decompressed));
	} catch {
		return failure('invalid-data', invalidLinkMessage);
	}
}

function encodeSharePayload(definition: PuzzleDefinitionV1): ShareResult<string> {
	const puzzleDefinition = serializePuzzleDefinition(definition);
	if (!parsePuzzleDefinition(puzzleDefinition).ok) {
		return failure('invalid-data', 'This puzzle contains data that cannot be shared.');
	}

	const definitionBytes = new TextEncoder().encode(puzzleDefinition);
	if (definitionBytes.length > maximumDecompressedDefinitionLength) {
		return failure('payload-too-large', 'This puzzle is too large to share in a reliable link.');
	}

	const compressed = deflate(definitionBytes, { level: 9 });
	const payload = `${shareLinkCodecVersion}.${encodeBase64Url(compressed)}`;
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
	if (rawFragment.startsWith('p=') && rawFragment.length > maximumSharePayloadLength + 2) {
		return { kind: 'error', error: { code: 'payload-too-large', message: oversizedLinkMessage } };
	}

	const parameters = new URLSearchParams(rawFragment);
	if (!parameters.has('p')) return { kind: 'none' };

	const entries = [...parameters.entries()];
	if (
		entries.length !== 1 ||
		entries[0][0] !== 'p' ||
		entries[0][1].length === 0 ||
		rawFragment !== `p=${entries[0][1]}`
	) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	const payload = entries[0][1];
	if (payload.length > maximumSharePayloadLength) {
		return { kind: 'error', error: { code: 'payload-too-large', message: oversizedLinkMessage } };
	}

	const separatorIndex = payload.indexOf('.');
	if (separatorIndex <= 0) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	const versionText = payload.slice(0, separatorIndex);
	if (!/^[1-9]\d*$/.test(versionText)) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}

	const version = Number(versionText);
	if (!Number.isSafeInteger(version)) {
		return { kind: 'error', error: { code: 'invalid-data', message: invalidLinkMessage } };
	}
	if (version !== shareLinkCodecVersion) {
		return {
			kind: 'error',
			error: { code: 'unsupported-version', message: unsupportedLinkMessage }
		};
	}

	const decoded = decodeBase64Url(payload.slice(separatorIndex + 1));
	if (!decoded.ok) return { kind: 'error', error: decoded.error };

	const decompressed = decompressDefinition(decoded.value);
	if (!decompressed.ok) return { kind: 'error', error: decompressed.error };

	const restored = deserializePuzzleDefinition(decompressed.value);
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

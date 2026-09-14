import type { Cell } from './gridUtils';

export const sudokuSize = 9;
export const germanWhisperMinimumDifference = 5;

/** A German Whispers line stores its cells as zero-based, row-major grid indexes. */
export type GermanWhisperLine = number[];

export function getCellIndex(cell: Pick<Cell, 'rowNumber0based' | 'colNumber0based'>) {
	return cell.rowNumber0based * sudokuSize + cell.colNumber0based;
}

export function areAdjacentCellIndexes(left: number, right: number) {
	if (!Number.isInteger(left) || !Number.isInteger(right) || left === right) return false;
	if (left < 0 || left >= sudokuSize ** 2 || right < 0 || right >= sudokuSize ** 2) {
		return false;
	}

	const rowDifference = Math.abs(Math.floor(left / sudokuSize) - Math.floor(right / sudokuSize));
	const columnDifference = Math.abs((left % sudokuSize) - (right % sudokuSize));
	return rowDifference <= 1 && columnDifference <= 1;
}

export function isGermanWhisperLine(value: unknown): value is GermanWhisperLine {
	return (
		Array.isArray(value) &&
		value.length >= 2 &&
		value.length <= sudokuSize ** 2 &&
		value.every(
			(cellIndex) => Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < sudokuSize ** 2
		) &&
		value
			.slice(1)
			.every((cellIndex, index) => areAdjacentCellIndexes(Number(value[index]), Number(cellIndex)))
	);
}

export function getGermanWhisperCellIndexes(lines: readonly GermanWhisperLine[]) {
	return new Set(lines.flat());
}

/** Removes selected cells from lines, preserving each remaining run that still has an edge. */
export function cutGermanWhisperLinesAtCells(
	lines: readonly GermanWhisperLine[],
	cellIndexes: ReadonlySet<number>
) {
	return lines.flatMap<GermanWhisperLine>((line) => {
		const remainingRuns: GermanWhisperLine[] = [];
		let currentRun: GermanWhisperLine = [];

		for (const cellIndex of line) {
			if (cellIndexes.has(cellIndex)) {
				if (currentRun.length >= 2) remainingRuns.push(currentRun);
				currentRun = [];
			} else {
				currentRun.push(cellIndex);
			}
		}
		if (currentRun.length >= 2) remainingRuns.push(currentRun);

		return remainingRuns;
	});
}

export function germanWhisperValuesAreValid(left: number, right: number) {
	return Math.abs(left - right) >= germanWhisperMinimumDifference;
}

export function getGermanWhisperConflictIndexes(
	values: readonly (number | null)[],
	lines: readonly GermanWhisperLine[]
) {
	const conflicts = new Set<number>();

	for (const line of lines) {
		for (let pointIndex = 0; pointIndex < line.length; pointIndex += 1) {
			const cellIndex = line[pointIndex];
			const value = values[cellIndex];
			if (value === germanWhisperMinimumDifference) conflicts.add(cellIndex);

			if (pointIndex === 0 || value === null) continue;
			const previousCellIndex = line[pointIndex - 1];
			const previousValue = values[previousCellIndex];
			if (previousValue !== null && !germanWhisperValuesAreValid(previousValue, value)) {
				conflicts.add(previousCellIndex);
				conflicts.add(cellIndex);
			}
		}
	}

	return conflicts;
}

export function areGermanWhispersComplete(
	values: readonly (number | null)[],
	lines: readonly GermanWhisperLine[]
) {
	return lines.every((line) =>
		line.slice(1).every((cellIndex, index) => {
			const left = values[line[index]];
			const right = values[cellIndex];
			return left !== null && right !== null && germanWhisperValuesAreValid(left, right);
		})
	);
}

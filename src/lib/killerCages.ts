import { sudokuSize } from './germanWhispers';

export const maximumKillerCageSize = 9;

/** Killer cage cells are stored as unique, zero-based, row-major grid indexes. */
export interface KillerCage {
	sum: number;
	cells: number[];
}

export function areOrthogonallyAdjacentCellIndexes(left: number, right: number) {
	if (!Number.isInteger(left) || !Number.isInteger(right) || left === right) return false;
	if (left < 0 || left >= sudokuSize ** 2 || right < 0 || right >= sudokuSize ** 2) {
		return false;
	}

	const rowDifference = Math.abs(Math.floor(left / sudokuSize) - Math.floor(right / sudokuSize));
	const columnDifference = Math.abs((left % sudokuSize) - (right % sudokuSize));
	return rowDifference + columnDifference === 1;
}

export function killerCageCellsAreConnected(cells: readonly number[]) {
	if (cells.length === 0) return false;

	const unvisited = new Set(cells);
	const queue = [cells[0]];
	unvisited.delete(cells[0]);

	for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
		const current = queue[queueIndex];
		for (const candidate of [...unvisited]) {
			if (!areOrthogonallyAdjacentCellIndexes(current, candidate)) continue;
			unvisited.delete(candidate);
			queue.push(candidate);
		}
	}

	return unvisited.size === 0;
}

/** Returns every total achievable with `cellCount` distinct digits from 1 through 9. */
export function getValidKillerCageSums(cellCount: number) {
	if (!Number.isInteger(cellCount) || cellCount < 1 || cellCount > maximumKillerCageSize) {
		return [];
	}

	let combinations: number[][] = [[]];
	for (let digit = 1; digit <= 9; digit += 1) {
		combinations = [
			...combinations,
			...combinations
				.filter((combination) => combination.length < cellCount)
				.map((combination) => [...combination, digit])
		];
	}

	return [
		...new Set(
			combinations
				.filter((combination) => combination.length === cellCount)
				.map((combination) => combination.reduce((sum, digit) => sum + digit, 0))
		)
	].sort((left, right) => left - right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isKillerCage(value: unknown): value is KillerCage {
	if (!isRecord(value) || Object.keys(value).sort().join(',') !== 'cells,sum') return false;
	if (
		!Number.isInteger(value.sum) ||
		!Array.isArray(value.cells) ||
		value.cells.length < 1 ||
		value.cells.length > maximumKillerCageSize ||
		value.cells.some(
			(cellIndex) => !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= sudokuSize ** 2
		) ||
		new Set(value.cells).size !== value.cells.length ||
		!killerCageCellsAreConnected(value.cells)
	) {
		return false;
	}

	return getValidKillerCageSums(value.cells.length).includes(Number(value.sum));
}

export function killerCagesAreDisjoint(cages: readonly KillerCage[]) {
	const occupiedCells = new Set<number>();
	for (const cage of cages) {
		for (const cellIndex of cage.cells) {
			if (occupiedCells.has(cellIndex)) return false;
			occupiedCells.add(cellIndex);
		}
	}
	return true;
}

export function getKillerCageCellIndexes(cages: readonly KillerCage[]) {
	return new Set(cages.flatMap((cage) => cage.cells));
}

export function removeKillerCagesAtCells(
	cages: readonly KillerCage[],
	cellIndexes: ReadonlySet<number>
) {
	return cages.filter((cage) => !cage.cells.some((cellIndex) => cellIndexes.has(cellIndex)));
}

function remainingSumIsPossible(
	target: number,
	availableDigits: readonly number[],
	digitsNeeded: number
) {
	if (digitsNeeded === 0) return target === 0;
	if (digitsNeeded < 0 || availableDigits.length < digitsNeeded) return false;

	const search = (start: number, remainingCount: number, remainingTarget: number): boolean => {
		if (remainingCount === 0) return remainingTarget === 0;
		for (let index = start; index <= availableDigits.length - remainingCount; index += 1) {
			const digit = availableDigits[index];
			if (digit > remainingTarget) break;
			if (search(index + 1, remainingCount - 1, remainingTarget - digit)) return true;
		}
		return false;
	};

	return search(0, digitsNeeded, target);
}

function cageValuesCanBeCompleted(values: readonly (number | null)[], target: number) {
	const filledValues = values.filter((value): value is number => value !== null);
	if (new Set(filledValues).size !== filledValues.length) return false;

	const currentSum = filledValues.reduce((sum, value) => sum + value, 0);
	const missingCount = values.length - filledValues.length;
	const usedDigits = new Set(filledValues);
	const availableDigits = Array.from({ length: 9 }, (_, index) => index + 1).filter(
		(digit) => !usedDigits.has(digit)
	);
	return remainingSumIsPossible(target - currentSum, availableDigits, missingCount);
}

export function getKillerCageConflictIndexes(
	values: readonly (number | null)[],
	cages: readonly KillerCage[]
) {
	const conflicts = new Set<number>();
	for (const cage of cages) {
		const cageValues = cage.cells.map((cellIndex) => values[cellIndex]);
		if (cageValuesCanBeCompleted(cageValues, cage.sum)) continue;
		for (const [index, value] of cageValues.entries()) {
			if (value !== null) conflicts.add(cage.cells[index]);
		}
	}
	return conflicts;
}

export function areKillerCagesComplete(
	values: readonly (number | null)[],
	cages: readonly KillerCage[]
) {
	return cages.every((cage) => {
		const cageValues = cage.cells.map((cellIndex) => values[cellIndex]);
		return (
			cageValues.every((value) => value !== null) && cageValuesCanBeCompleted(cageValues, cage.sum)
		);
	});
}

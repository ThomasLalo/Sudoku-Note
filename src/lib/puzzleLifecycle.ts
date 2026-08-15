const sudokuSize = 9;

function isCompleteUnit(values: readonly (number | null)[]) {
	return (
		values.length === sudokuSize &&
		values.every(
			(value) => Number.isInteger(value) && value !== null && value >= 1 && value <= 9
		) &&
		new Set(values).size === sudokuSize
	);
}

export function isStandardSudokuComplete(rows: readonly (readonly (number | null)[])[]) {
	if (rows.length !== sudokuSize || rows.some((row) => row.length !== sudokuSize)) return false;
	if (!rows.every(isCompleteUnit)) return false;

	for (let columnIndex = 0; columnIndex < sudokuSize; columnIndex += 1) {
		if (!isCompleteUnit(rows.map((row) => row[columnIndex]))) return false;
	}

	for (let boxRow = 0; boxRow < sudokuSize; boxRow += 3) {
		for (let boxColumn = 0; boxColumn < sudokuSize; boxColumn += 3) {
			const boxValues = rows
				.slice(boxRow, boxRow + 3)
				.flatMap((row) => row.slice(boxColumn, boxColumn + 3));
			if (!isCompleteUnit(boxValues)) return false;
		}
	}

	return true;
}

export function formatElapsedTime(elapsedMilliseconds: number) {
	const elapsedSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
	const seconds = elapsedSeconds % 60;
	const elapsedMinutes = Math.floor(elapsedSeconds / 60);
	const minutes = elapsedMinutes % 60;
	const hours = Math.floor(elapsedMinutes / 60);
	const parts = [minutes, seconds];
	if (hours > 0) parts.unshift(hours);

	return parts.map((part) => String(part).padStart(2, '0')).join(':');
}

export function calculateElapsedMilliseconds(
	accumulatedActiveMilliseconds: number,
	activeTimerStartedAt: number | null,
	now: number
) {
	return (
		accumulatedActiveMilliseconds +
		(activeTimerStartedAt === null ? 0 : Math.max(0, now - activeTimerStartedAt))
	);
}

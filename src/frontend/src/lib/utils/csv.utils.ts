import { isNullish } from '@dfinity/utils';

export type CsvCell = string | number | bigint | null | undefined;

export type CsvRow = Record<string, CsvCell>;

export interface CsvColumn<R extends CsvRow> {
	key: keyof R & string;
	header: string;
}

const SPREADSHEET_FORMULA_PATTERN = /^[=+@]/;
const NEGATIVE_NUMBER_PATTERN = /^-\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

const isSpreadsheetFormula = (value: string): boolean => {
	const trimmedValue = value.trim();

	return (
		SPREADSHEET_FORMULA_PATTERN.test(trimmedValue) ||
		(trimmedValue.startsWith('-') && !NEGATIVE_NUMBER_PATTERN.test(trimmedValue))
	);
};

const escapeCsvCell = (cell: CsvCell): string => {
	if (isNullish(cell)) {
		return '';
	}

	const rawValue = typeof cell === 'bigint' ? cell.toString() : String(cell);
	const value = isSpreadsheetFormula(rawValue) ? `'${rawValue}` : rawValue;

	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export const toCsv = <R extends CsvRow>({
	columns,
	rows
}: {
	columns: CsvColumn<R>[];
	rows: R[];
}): string => {
	const headerLine = columns.map(({ header }) => escapeCsvCell(header)).join(',');
	const dataLines = rows.map((row) => columns.map(({ key }) => escapeCsvCell(row[key])).join(','));

	return [headerLine, ...dataLines].join('\r\n');
};

export const downloadCsv = ({ filename, csv }: { filename: string; csv: string }): void => {
	// Prepend UTF-8 BOM so Excel auto-detects the encoding for non-ASCII characters.
	const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();

	URL.revokeObjectURL(url);
};

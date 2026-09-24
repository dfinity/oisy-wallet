import { isNullish, nonNullish } from '@dfinity/utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sources = new Map<string, string>();

const readSource = (path: string): string => {
	const cached = sources.get(path);

	if (nonNullish(cached)) {
		return cached;
	}

	const source = readFileSync(join(process.cwd(), path), 'utf-8');

	sources.set(path, source);

	return source;
};

// Deliberately not `eval`: the expression is validated to hold nothing but integer literals, `+`
// and `*` before it is folded, so a constant defined in terms of anything else fails loudly
// instead of running arbitrary source as code.
const foldIntegerExpression = (expression: string): number =>
	expression
		.split('+')
		.reduce(
			(sum, term) =>
				sum +
				term
					.split('*')
					.reduce((product, factor) => product * Number(factor.trim().replaceAll('_', '')), 1),
			0
		);

/**
 * Reads a numeric `pub const` straight out of a Rust source file.
 *
 * Frontend constants that mirror a canister limit have no runtime safety net when they drift: the
 * canister refuses the call rather than clamping to its own value, so a parity test has to read the
 * real number rather than restate it. Restating it is the bug.
 *
 * Handles plain literals (`500`, `10_000`) and products or sums of them (`16 * 1024`). A constant
 * defined by anything else, or one whose value exceeds the safe integer range, throws rather than
 * returning something subtly wrong.
 *
 * @param path - Repo-relative path to the Rust file, e.g. `src/shared/src/types/user_transaction.rs`.
 * @param name - The constant's name, e.g. `MAX_SAVE_USER_TRANSACTIONS_BATCH`.
 */
export const readRustNumericConstant = ({ path, name }: { path: string; name: string }): number => {
	const match = readSource(path).match(new RegExp(`pub const ${name}:\\s*\\w+\\s*=\\s*([^;]+);`));

	if (isNullish(match)) {
		throw new Error(`Rust constant \`${name}\` not found in ${path}`);
	}

	const expression = match[1].trim();

	if (!/^[0-9_*+\s]+$/.test(expression)) {
		throw new Error(
			`Rust constant \`${name}\` is \`${expression}\`, which this helper cannot read: it handles integer literals joined by \`*\` and \`+\` only.`
		);
	}

	const value = foldIntegerExpression(expression);

	if (!Number.isSafeInteger(value)) {
		throw new Error(
			`Rust constant \`${name}\` is ${expression}, which exceeds the safe integer range. Compare it as a bigint instead.`
		);
	}

	return value;
};

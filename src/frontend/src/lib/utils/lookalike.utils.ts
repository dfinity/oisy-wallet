import { CONFUSABLES } from '$lib/constants/confusables.constants';
import { notEmptyString } from '@dfinity/utils';

// Accents, invisible characters and spaces: none of them is something a reader tells apart at a
// glance.
const UNSEEN = /[\p{M}\p{Default_Ignorable_Code_Point}\s]/gu;

/**
 * The form a text takes once every character is replaced by the Latin letter or digit it looks like,
 * per Unicode's list of lookalike characters (UTS #39), and accents, invisible characters, spaces and
 * case are dropped. Two texts with the same key look alike: `USDC`, for example, and `USDC` with a
 * Cyrillic C (U+0421) in place of the last letter, or in full-width letters.
 *
 * The case is lowered last, because the list maps some letters in one case only (`I` to `l`, `m` to
 * `rn`), so two texts that differ only in case can get different keys. `findLookalike` covers that.
 */
export const toLookalikeKey = (text: string): string =>
	[...text.normalize('NFD').replace(UNSEEN, '')]
		.map((char) => CONFUSABLES[char] ?? char)
		.join('')
		.normalize('NFKC')
		.toLowerCase();

// A label both as written and in lower case: case alone never makes two labels different, while a
// lookalike such as a capital I for a lowercase l only shows in the case it is written in. The key
// mapped once more covers a character that only turns into a letter with a lookalike after the
// mapping: a circled m (NFKC) or a mathematical capital M (lower case) becomes an m, which maps to rn.
const toLookalikeKeys = (label: string): string[] => [
	toLookalikeKey(label),
	toLookalikeKey(label.toLowerCase()),
	toLookalikeKey(toLookalikeKey(label))
];

interface Labels {
	symbol: string;
	name: string;
}

// The symbol and name OISY shows for a token in place of its ledger's own, where it has one.
interface ShownLabels {
	oisySymbol?: { oisySymbol: string };
	oisyName?: { oisyName: string };
}

/**
 * The first of `among` whose symbol or name, its ledger's own or the one OISY shows, looks like the
 * symbol or name of `token`, if any.
 */
export const findLookalike = <T extends Labels & ShownLabels>({
	token: { symbol, name },
	among
}: {
	token: Partial<Labels>;
	among: readonly T[];
}): T | undefined => {
	const keys = new Set(
		[symbol, name].filter(notEmptyString).flatMap(toLookalikeKeys).filter(notEmptyString)
	);

	if (keys.size === 0) {
		return undefined;
	}

	return among.find(({ symbol, name, oisySymbol, oisyName }) =>
		[symbol, name, oisySymbol?.oisySymbol, oisyName?.oisyName].some(
			(label) => notEmptyString(label) && toLookalikeKeys(label).some((key) => keys.has(key))
		)
	);
};

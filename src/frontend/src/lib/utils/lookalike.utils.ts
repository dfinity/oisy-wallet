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
 */
export const toLookalikeKey = (text: string): string =>
	[...text.normalize('NFD').replace(UNSEEN, '')]
		.map((char) => CONFUSABLES[char] ?? char)
		.join('')
		.normalize('NFKC')
		.toLowerCase();

interface Labels {
	symbol: string;
	name: string;
}

/**
 * The first of `among` whose symbol or name looks like the symbol or name of `token`, if any.
 */
export const findLookalike = <T extends Labels>({
	token: { symbol, name },
	among
}: {
	token: Partial<Labels>;
	among: readonly T[];
}): T | undefined => {
	const keys = new Set(
		[symbol, name].filter(notEmptyString).map(toLookalikeKey).filter(notEmptyString)
	);

	if (keys.size === 0) {
		return undefined;
	}

	return among.find(({ symbol, name }) =>
		[symbol, name].some((label) => notEmptyString(label) && keys.has(toLookalikeKey(label)))
	);
};

import { isNullish } from '@dfinity/utils';

// The longest symbol of its own a token is shown with, the ellipsis included. Tickers run to a
// handful of characters, and the symbol sits inside a sentence, which a longer one would swamp.
const OWN_SYMBOL_MAX_LENGTH = 12;

// Characters that show nothing themselves or rearrange the ones around them: controls, format
// characters such as the bidirectional overrides and the zero-width joiners, code points that are
// private, unassigned or half of a pair, and the ones Unicode marks as ignorable by default, such
// as the variation selectors and the Hangul fillers, which are marks and letters by category.
const INVISIBLE_CHARACTERS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Default_Ignorable_Code_Point}]/gu;

/**
 * A symbol a token carries in its own contract or account, as it may be shown. Whoever creates the
 * token writes it, so it is kept to what is visible and cut to a ticker's length. Nothing left of
 * it is no symbol at all.
 */
export const visibleTokenSymbol = (symbol: string | undefined): string | undefined => {
	if (isNullish(symbol)) {
		return undefined;
	}

	// Counted in code points, so a symbol cannot stretch past the bound on marks stacked onto a
	// single letter.
	const characters = [...symbol.replace(INVISIBLE_CHARACTERS, '').replace(/\s+/gu, ' ').trim()];

	if (characters.length === 0) {
		return undefined;
	}

	return characters.length > OWN_SYMBOL_MAX_LENGTH
		? `${characters
				.slice(0, OWN_SYMBOL_MAX_LENGTH - 1)
				.join('')
				.trimEnd()}…`
		: characters.join('');
};

import type { Languages } from '$lib/enums/languages';
import { TokenTagType, type TokenCategoryTagValue } from '$lib/enums/token-tag';
import type { Token } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { isNullish } from '@dfinity/utils';

export const getTokenCategoryTag = (
	token: Pick<Token, 'tags'>
): TokenCategoryTagValue | undefined =>
	token.tags.find((tag) => tag.type === TokenTagType.CATEGORY)?.value;

const matchesCategory = ({
	token,
	category
}: {
	token: Pick<Token, 'tags'>;
	category: TokenCategoryTagValue;
}): boolean => getTokenCategoryTag(token) === category;

export const filterTokensByCategory = ({
	tokens,
	category
}: {
	tokens: TokenUiOrGroupUi[];
	category: TokenCategoryTagValue | undefined;
}): TokenUiOrGroupUi[] => {
	if (isNullish(category)) {
		return tokens;
	}

	return tokens.filter((item) =>
		isTokenUiGroup(item)
			? item.group.tokens.some((token: TokenUi) => matchesCategory({ token, category }))
			: matchesCategory({ token: item.token, category })
	);
};

export const filterTokensUiByCategory = ({
	tokens,
	category
}: {
	tokens: TokenUi[];
	category: TokenCategoryTagValue | undefined;
}): TokenUi[] => {
	if (isNullish(category)) {
		return tokens;
	}

	return tokens.filter((token) => matchesCategory({ token, category }));
};

// Most asset-type labels read inside a sentence once lowercased ("There are no
// stablecoins…"). A label that does not ("compute") carries its own in-sentence
// form, which is used as translated: lowercasing it would break languages that
// capitalise nouns.
export const getTokenCategorySentenceLabel = ({
	category,
	i18n,
	language
}: {
	category: TokenCategoryTagValue;
	i18n: I18n;
	language: Languages;
}): string => {
	const inSentence: Partial<Record<TokenCategoryTagValue, string>> =
		i18n.token_tag.category_in_sentence;

	return inSentence[category] ?? i18n.token_tag.category[category].toLocaleLowerCase(language);
};

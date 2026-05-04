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

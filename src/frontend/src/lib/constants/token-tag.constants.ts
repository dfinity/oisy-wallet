import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { Token } from '$lib/types/token';

export const DEFAULT_TOKEN_TAGS: Token['tags'] = [
	{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }
];

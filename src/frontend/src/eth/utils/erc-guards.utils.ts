import type { NftCollection } from '$lib/types/nft';
import type { Token, TokenStandardCode } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';

export const tokenStandardGuard =
	<T extends Token>(code: TokenStandardCode) =>
	(token: Token): token is T =>
		token.standard.code === code;

export const collectionStandardGuard =
	(code: TokenStandardCode) =>
	(collection: NftCollection): boolean =>
		collection.standard.code === code;

export const toggleableTokenGuard =
	<T extends Token>(isStandard: (token: Token) => boolean) =>
	(token: Token): token is T =>
		isStandard(token) && isTokenToggleable(token);

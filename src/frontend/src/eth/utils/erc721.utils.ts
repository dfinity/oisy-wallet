import type { Erc721Token } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import {
	collectionStandardGuard,
	toggleableTokenGuard,
	tokenStandardGuard
} from '$lib/utils/token-guards.utils';

export const isTokenErc721 = tokenStandardGuard<Erc721Token>('erc721');

export const isCollectionErc721 = collectionStandardGuard('erc721');

export const isTokenErc721CustomToken = toggleableTokenGuard<Erc721CustomToken>(isTokenErc721);

import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import {
	collectionStandardGuard,
	toggleableTokenGuard,
	tokenStandardGuard
} from '$lib/utils/token-guards.utils';

export const isTokenErc1155 = tokenStandardGuard<Erc1155Token>('erc1155');

export const isCollectionErc1155 = collectionStandardGuard('erc1155');

export const isTokenErc1155CustomToken = toggleableTokenGuard<Erc1155CustomToken>(isTokenErc1155);

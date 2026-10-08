import { ICP_NETWORK_ID, ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import { isTokenIcrc7CustomToken } from '$icp/utils/icrc7.utils';
import { COLLECTION_PARAM, NETWORK_PARAM, NFT_PARAM } from '$lib/constants/routes.constants';
import { CanisterIdTextSchema, type CanisterIdText } from '$lib/types/canister';
import type { CustomToken } from '$lib/types/custom-token';
import type { NetworkId } from '$lib/types/network';
import type { NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

export interface Icrc7CollectionDeepLink {
	canisterId: CanisterIdText;
	networkId: NetworkId;
}

export type Icrc7CollectionDeepLinkAction =
	| ({ type: 'import' } & Icrc7CollectionDeepLink)
	| ({ type: 'enable'; token: Icrc7CustomToken } & Icrc7CollectionDeepLink)
	| ({ type: 'ready'; token: Icrc7CustomToken } & Icrc7CollectionDeepLink);

export const parseIcrc7CollectionDeepLink = ({
	url
}: {
	url: URL;
}): Icrc7CollectionDeepLink | undefined => {
	const collection = url.searchParams.get(COLLECTION_PARAM);
	const network = url.searchParams.get(NETWORK_PARAM);

	if (network !== ICP_NETWORK_SYMBOL || url.searchParams.has(NFT_PARAM)) {
		return;
	}

	const parsedCollection = CanisterIdTextSchema.safeParse(collection);

	if (!parsedCollection.success) {
		return;
	}

	return {
		canisterId: parsedCollection.data,
		networkId: ICP_NETWORK_ID
	};
};

export const resolveIcrc7CollectionDeepLinkAction = ({
	url,
	tokens
}: {
	url: URL;
	tokens: CustomToken<NonFungibleToken>[];
}): Icrc7CollectionDeepLinkAction | undefined => {
	const deepLink = parseIcrc7CollectionDeepLink({ url });

	if (isNullish(deepLink)) {
		return;
	}

	const token = tokens.find(
		(token) => 'canisterId' in token && token.canisterId === deepLink.canisterId
	);

	if (isNullish(token)) {
		return { type: 'import', ...deepLink };
	}

	if (!isTokenIcrc7CustomToken(token)) {
		return;
	}

	return { type: token.enabled ? 'ready' : 'enable', token, ...deepLink };
};

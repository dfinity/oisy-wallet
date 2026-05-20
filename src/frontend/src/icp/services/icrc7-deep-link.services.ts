import { ICP_NETWORK_ID, ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import { COLLECTION_PARAM, NETWORK_PARAM } from '$lib/constants/routes.constants';
import { CanisterIdTextSchema, type CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';

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

	if (network !== ICP_NETWORK_SYMBOL) {
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
	tokens: Icrc7CustomToken[];
}): Icrc7CollectionDeepLinkAction | undefined => {
	const deepLink = parseIcrc7CollectionDeepLink({ url });

	if (deepLink === undefined) {
		return;
	}

	const token = tokens.find(({ canisterId }) => canisterId === deepLink.canisterId);

	if (token === undefined) {
		return { type: 'import', ...deepLink };
	}

	return { type: token.enabled ? 'ready' : 'enable', token, ...deepLink };
};

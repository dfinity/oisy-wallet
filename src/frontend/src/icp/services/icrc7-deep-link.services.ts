import { ICP_NETWORK_ID, ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { COLLECTION_PARAM, NETWORK_PARAM } from '$lib/constants/routes.constants';
import { CanisterIdTextSchema, type CanisterIdText } from '$lib/types/canister';
import type { NetworkId } from '$lib/types/network';

export interface Icrc7CollectionDeepLink {
	canisterId: CanisterIdText;
	networkId: NetworkId;
}

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

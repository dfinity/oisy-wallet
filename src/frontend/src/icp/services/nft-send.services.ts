import { transferExtV2 } from '$icp/services/nft-transfer.services';
import { isTokenExtV2 } from '$icp/utils/ext.utils';
import type { SendNftCommonParams, TransferParams } from '$lib/types/send';
import { isNetworkIdICP } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

export const sendNft = async ({
	token,
	tokenId,
	identity,
	progress,
	to
}: SendNftCommonParams & Pick<TransferParams, 'to'>) => {
	if (isNullish(identity)) {
		return;
	}

	const {
		network: { id: networkId }
	} = token;

	if (isNetworkIdICP(networkId)) {
		if (isTokenExtV2(token)) {
			await transferExtV2({
				identity,
				canisterId: token.canisterId,
				from: identity.getPrincipal(),
				to: Principal.fromText(to),
				tokenIdentifier: tokenId,
				amount: 1n, // currently fixed at 1
				progress
			});
		}
	}
};

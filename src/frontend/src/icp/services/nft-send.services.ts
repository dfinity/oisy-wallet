import {
	transferDip721,
	transferExtV2,
	transferIcPunks
} from '$icp/services/nft-transfer.services';
import { isTokenDip721 } from '$icp/utils/dip721.utils';
import { isTokenExt } from '$icp/utils/ext.utils';
import { isTokenIcPunks } from '$icp/utils/icpunks.utils';
import type { ProgressStepsSendIc } from '$lib/enums/progress-steps';
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
}: SendNftCommonParams<ProgressStepsSendIc> & Pick<TransferParams, 'to'>) => {
	if (isNullish(identity)) {
		return;
	}

	const {
		network: { id: networkId }
	} = token;

	if (isNetworkIdICP(networkId)) {
		if (isTokenExt(token)) {
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

		if (isTokenDip721(token)) {
			await transferDip721({
				identity,
				canisterId: token.canisterId,
				to: Principal.fromText(to),
				tokenIdentifier: BigInt(tokenId),
				progress
			});
		}

		if (isTokenIcPunks(token)) {
			await transferIcPunks({
				identity,
				canisterId: token.canisterId,
				to: Principal.fromText(to),
				tokenIdentifier: BigInt(tokenId),
				progress
			});
		}
	}
};

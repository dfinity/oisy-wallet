import { transferErc1155, transferErc721 } from '$eth/services/nft-transfer.services';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { NftId, NonFungibleToken } from '$lib/types/nft';
import type { TransferParams } from '$lib/types/send';
import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

export const sendNft = async ({
	token,
	tokenId,
	to,
	from,
	identity,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	progress
}: {
	token: NonFungibleToken;
	tokenId: NftId;
	identity: OptionIdentity;
	progress?: (step: ProgressStepsSend) => void;
} & (Pick<TransferParams, 'from' | 'to' | 'maxFeePerGas' | 'maxPriorityFeePerGas'> & {
	gas: bigint;
})) => {
	if (isNullish(identity)) {
		return;
	}

	const {
		network: { id: networkId }
	} = token;

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		if (isTokenErc721(token)) {
			await transferErc721({
				contractAddress: token.address,
				tokenId,
				sourceNetwork: token.network,
				from,
				to,
				identity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});

			return;
		}

		if (isTokenErc1155(token)) {
			await transferErc1155({
				contractAddress: token.address,
				id: tokenId,
				sourceNetwork: token.network,
				from,
				to,
				identity,
				amount: 1n, // currently fixed at 1
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
		}
	}
};

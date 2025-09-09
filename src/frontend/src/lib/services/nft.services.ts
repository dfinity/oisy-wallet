import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { transferErc1155, transferErc721 } from '$eth/services/nft-send.services';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import { nullishSignOut } from '$lib/services/auth.services';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Nft, NftId, NonFungibleToken } from '$lib/types/nft';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}) => {
	if (isNullish(walletAddress)) {
		return;
	}

	for (const token of tokens) {
		const { getNftsByOwner } = alchemyProviders(token.network.id);

		let nfts: Nft[] = [];
		try {
			nfts = await getNftsByOwner({ address: walletAddress, token });
		} catch (_: unknown) {
			console.warn(
				`Failed to load NFTs for token: ${token.address} on network: ${token.network.id.toString()}.`
			);
			nfts = [];
		}

		nftStore.addAll(nfts);
	}
};

export const sendNft = async ({
	token,
	tokenId,
	destination,
	fromAddress,
	identity,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	progress
}: {
	token: NonFungibleToken;
	tokenId: NftId;
	destination: string;
	fromAddress: string;
	identity: OptionIdentity;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	progress?: (step: ProgressStepsSend) => void;
}) => {
	if (isNullish(identity)) {
		await nullishSignOut();
	} else {
		let tx;
		if (isTokenErc721(token)) {
			tx = await transferErc721({
				contractAddress: token.address,
				tokenId,
				sourceNetwork: token.network,
				from: fromAddress,
				to: destination,
				identity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
		} else if (isTokenErc1155(token)) {
			tx = await transferErc1155({
				contractAddress: token.address,
				id: tokenId,
				sourceNetwork: token.network,
				from: fromAddress,
				to: destination,
				identity,
				amount: 1n, // currently fixed at 1
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
		}

		console.log('tx', tx);
	}
};

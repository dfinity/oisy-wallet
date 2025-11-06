import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
import { transferErc1155, transferErc721 } from '$eth/services/nft-send.services';
import type { OptionEthAddress } from '$eth/types/address';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import { createBatches } from '$lib/services/batch.services';
import { nftStore } from '$lib/stores/nft.store';
import type { Address } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftId, NonFungibleToken } from '$lib/types/nft';
import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
import { getTokensByNetwork } from '$lib/utils/nft.utils';
import { isNullish } from '@dfinity/utils';

export const loadNfts = async ({
	tokens,
	walletAddress
}: {
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}) => {
	const tokensByNetwork = getTokensByNetwork(tokens);

	const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
		if (tokens.length === 0) {
			return;
		}

		const nfts: Nft[] = await loadNftsByNetwork({
			networkId,
			tokens,
			walletAddress
		});

		nftStore.addAll(nfts);
	});

	await Promise.allSettled(promises);
};

export const loadNftsByNetwork = async ({
	networkId,
	tokens,
	walletAddress
}: {
	networkId: NetworkId;
	tokens: NonFungibleToken[];
	walletAddress: OptionEthAddress;
}): Promise<Nft[]> => {
	if (isNullish(walletAddress)) {
		return [];
	}

	const { getNftsByOwner } = alchemyProviders(networkId);

	const batches = createBatches<NonFungibleToken>({ items: tokens, batchSize: 40 });

	const nfts: Nft[] = [];
	for (const batch of batches) {
		try {
			nfts.push(...(await getNftsByOwner({ address: walletAddress, tokens: batch })));
		} catch (err: unknown) {
			const tokenAddresses = batch.map((token) => token.address);
			console.warn(
				`Failed to load NFTs for tokens: ${tokenAddresses} on network: ${networkId.toString()}.`,
				err
			);
		}
	}

	return nfts;
};

export const sendNft = async ({
	token,
	tokenId,
	toAddress,
	fromAddress,
	identity,
	gas,
	maxFeePerGas,
	maxPriorityFeePerGas,
	progress
}: {
	token: NonFungibleToken;
	tokenId: NftId;
	toAddress: Address;
	fromAddress: Address;
	identity: OptionIdentity;
	gas: bigint;
	maxFeePerGas: bigint;
	maxPriorityFeePerGas: bigint;
	progress?: (step: ProgressStepsSend) => void;
}) => {
	if (isNullish(identity)) {
		return;
	}

	if (isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)) {
		if (isTokenErc721(token)) {
			await transferErc721({
				contractAddress: token.address,
				tokenId,
				sourceNetwork: token.network,
				from: fromAddress,
				to: toAddress,
				identity,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
				progress
			});
		} else if (isTokenErc1155(token)) {
			await transferErc1155({
				contractAddress: token.address,
				id: tokenId,
				sourceNetwork: token.network,
				from: fromAddress,
				to: toAddress,
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

export const updateNftSection = async ({
	section,
	$authIdentity,
	token,
	$ethAddress
}: {
	section: CustomTokenSection | undefined;
	$authIdentity: OptionIdentity;
	token: NonFungibleToken;
	$ethAddress: OptionEthAddress;
}): Promise<NonFungibleToken | undefined> => {
	if (isNullish($authIdentity)) {
		return;
	}

	const currentAllowMedia = token.allowExternalContentSource;

	const saveToken = {
		...token,
		enabled: true,
		section,
		...((section === CustomTokenSection.SPAM ||
			(section === CustomTokenSection.HIDDEN && isNullish(currentAllowMedia))) && {
			allowExternalContentSource: false
		})
	};

	if (isTokenErc721(token)) {
		await saveCustomErc721Token({
			identity: $authIdentity,
			tokens: [saveToken]
		});
	} else if (isTokenErc1155(token)) {
		await saveCustomErc1155Token({
			identity: $authIdentity,
			tokens: [saveToken]
		});
	}

	await loadNfts({
		tokens: [saveToken],
		walletAddress: $ethAddress
	});

	return saveToken;
};

import { saveCustomTokens as saveCustomErc1155Token } from '$eth/services/erc1155-custom-tokens.services';
import { saveCustomTokens as saveCustomErc721Token } from '$eth/services/erc721-custom-tokens.services';
import { transferErc1155, transferErc721 } from '$eth/services/nft-send.services';
import { loadNftsByNetwork as loadErcNftsByNetwork } from '$eth/services/nft.services';
import type { OptionEthAddress } from '$eth/types/address';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { isTokenErc1155, isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
import { isTokenErc721, isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
import { loadNfts as loadExtNfts } from '$icp/services/nft.services';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { saveCustomTokens as saveCustomExtToken } from '$icp/services/ext-custom-tokens.services';
import { loadNfts as loadExtNfts } from '$icp/services/nft.services';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { isTokenExtV2CustomToken } from '$icp/utils/ext.utils';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { ProgressStepsSend } from '$lib/enums/progress-steps';
import { nftStore } from '$lib/stores/nft.store';
import type { Address } from '$lib/types/address';
import type { CustomToken } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NftId, NonFungibleToken } from '$lib/types/nft';
import { isNetworkIdEthereum, isNetworkIdEvm, isNetworkIdICP } from '$lib/utils/network.utils';
import { getTokensByNetwork } from '$lib/utils/nft.utils';
import { isNullish } from '@dfinity/utils';

export const loadNftsByNetwork = async ({
	networkId,
	tokens,
	identity,
	ethAddress
}: {
	networkId: NetworkId;
	tokens: NonFungibleToken[];
	identity: OptionIdentity;
	ethAddress: OptionEthAddress;
}): Promise<Nft[]> => {
	if (tokens.length === 0) {
		return [];
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return await loadErcNftsByNetwork({
			networkId,
			// For now, it is acceptable to cast it since we checked before if the network is Ethereum or EVM.
			tokens: tokens as EthNonFungibleToken[],
			walletAddress: ethAddress
		});
	}

	if (isNetworkIdICP(networkId)) {
		return await loadExtNfts({
			// For now, it is acceptable to cast it since we checked before if the network is ICP.
			tokens: tokens as IcNonFungibleToken[],
			identity
		});
	}

	return [];
};

export const loadNfts = async ({
	tokens,
	identity,
	ethAddress
}: {
	tokens: NonFungibleToken[];
	identity: OptionIdentity;
	ethAddress: OptionEthAddress;
}) => {
	const tokensByNetwork = getTokensByNetwork(tokens);

	const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
		if (tokens.length === 0) {
			return;
		}

		const nfts: Nft[] = await loadErcNftsByNetwork({
			networkId,
			tokens,
			identity,
			ethAddress
		});

		nftStore.addAll(nfts);
	});

	await Promise.allSettled(promises);
};

export const saveNftCustomToken = async ({
	identity,
	token,
	$ethAddress
}: {
	identity: OptionIdentity;
	token: CustomToken<NonFungibleToken>;
	$ethAddress: OptionEthAddress;
}) => {
	if (isNullish(identity)) {
		return;
	}

	if (isTokenErc721CustomToken(token)) {
		await saveCustomErc721Token({
			identity,
			tokens: [token]
		});
	} else if (isTokenErc1155CustomToken(token)) {
		await saveCustomErc1155Token({
			identity,
			tokens: [token]
		});
	} else if (isTokenExtV2CustomToken(token)) {
		await saveCustomExtToken({
			identity,
			tokens: [token]
		});
	}

	await loadNfts({
		tokens: [token],
		identity,
		ethAddress: $ethAddress
	});
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

	await saveNftCustomToken({ identity: $authIdentity, token: saveToken, $ethAddress });

	return saveToken;
};

export const updateNftMediaConsent = async ({
	allowMedia,
	$authIdentity,
	token,
	$ethAddress
}: {
	allowMedia: boolean;
	$authIdentity: OptionIdentity;
	token: NonFungibleToken;
	$ethAddress: OptionEthAddress;
}): Promise<NonFungibleToken | undefined> => {
	const saveToken = {
		...token,
		enabled: true, // must be true otherwise we couldn't see it at this point
		allowExternalContentSource: allowMedia
	};

	await saveNftCustomToken({ identity: $authIdentity, token: saveToken, $ethAddress });

	return saveToken;
};

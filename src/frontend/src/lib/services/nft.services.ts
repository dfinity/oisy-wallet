import { loadNftsByNetwork as loadErcNftsByNetwork } from '$eth/services/nft.services';
import type { OptionEthAddress } from '$eth/types/address';
import type { EthNonFungibleToken } from '$eth/types/nft';
import { isTokenErc1155CustomToken } from '$eth/utils/erc1155.utils';
import { isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
import { loadNfts as loadExtNfts } from '$icp/services/nft.services';
import type { IcNonFungibleToken } from '$icp/types/nft';
import { isTokenExtCustomToken } from '$icp/utils/ext.utils';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import { nftStore } from '$lib/stores/nft.store';
import type { CustomToken } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Nft, NonFungibleToken } from '$lib/types/nft';
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

		const nfts: Nft[] = await loadNftsByNetwork({
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
		await saveCustomTokens({
			identity,
			tokens: [{ ...token, chainId: token.network.chainId, networkKey: 'Erc721' }]
		});
	} else if (isTokenErc1155CustomToken(token)) {
		await saveCustomTokens({
			identity,
			tokens: [{ ...token, chainId: token.network.chainId, networkKey: 'Erc1155' }]
		});
	} else if (isTokenExtCustomToken(token)) {
		await saveCustomTokens({
			identity,
			tokens: [{ ...token, networkKey: 'ExtV2' }]
		});
	}

	await loadNfts({
		tokens: [token],
		identity,
		ethAddress: $ethAddress
	});
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

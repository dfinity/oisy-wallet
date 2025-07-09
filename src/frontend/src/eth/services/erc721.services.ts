import type { CustomToken, Erc721Token } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import {
	InfuraERC721Provider,
	infuraErc721Providers
} from '$eth/providers/infura-erc721.providers';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { nftStore } from '$eth/stores/nft.store';
import type { Nft } from '$eth/types/erc721';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { getIdbEthTokens, setIdbEthTokens } from '$lib/api/idb-tokens.api';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address } from '$lib/types/address';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import { parseTokenId } from '$lib/validation/token.validation';
import { assertNonNullish, fromNullable, queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadErc721Tokens = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<void> => {
	await Promise.all([loadCustomTokens({ identity, useCache: true })]);
};

export const loadCustomTokens = ({
	identity,
	useCache = false
}: Omit<LoadCustomTokenParams, 'certified'>): Promise<void> =>
	queryAndUpdate<Erc721CustomToken[]>({
		request: (params) => loadCustomTokensWithMetadata({ ...params, useCache }),
		onLoad: loadCustomTokenData,
		onUpdateError: ({ error: err }) => {
			erc721CustomTokensStore.resetAll();

			toastsError({
				msg: { text: get(i18n).init.error.erc721_custom_tokens },
				err
			});
		},
		identity,
		strategy: 'query'
	});

const loadErc721CustomTokens = async (params: LoadCustomTokenParams): Promise<CustomToken[]> =>
	await loadNetworkCustomTokens({
		...params,
		filterTokens: ({ token }) => 'Erc721' in token,
		setIdbTokens: setIdbEthTokens,
		getIdbTokens: getIdbEthTokens
	});

const loadCustomTokensWithMetadata = async (
	params: LoadCustomTokenParams
): Promise<Erc721CustomToken[]> => {
	const loadCustomContracts = async (): Promise<Erc721CustomToken[]> => {
		const erc721CustomTokens: CustomToken[] = await loadErc721CustomTokens(params);

		const customTokenPromises = erc721CustomTokens
			.filter(
				(customToken): customToken is CustomToken & { token: { Erc721: Erc721Token } } =>
					'Erc721' in customToken.token
			)
			.map(async ({ token, enabled, version: versionNullable }) => {
				const version = fromNullable(versionNullable);

				const {
					Erc721: { token_address: tokenAddress, chain_id: tokenChainId }
				} = token;

				const network = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS].find(
					({ chainId }) => tokenChainId === chainId
				);

				// This should not happen because we filter the chain_id in the previous filter, but we need it to be type safe
				assertNonNullish(
					network,
					`Inconsistency in network data: no network found for chainId ${tokenChainId} in custom token, even though it is in the environment`
				);

				const metadata = await infuraErc721Providers(network.id).metadata({
					address: tokenAddress
				});
				const { symbol } = metadata;

				return {
					...{
						id: parseTokenId(`custom-token#${symbol}#${network.chainId}`),
						name: tokenAddress,
						address: tokenAddress,
						network,
						symbol,
						decimals: 1,
						standard: 'erc721' as const,
						category: 'custom' as const,
						enabled,
						version
					},
					...metadata
				};
			});

		return Promise.all(customTokenPromises);
	};

	const customContracts = await loadCustomContracts();
	return await Promise.all(customContracts);
};

const loadCustomTokenData = ({
	response: tokens,
	certified
}: {
	certified: boolean;
	response: Erc721CustomToken[];
}) => {
	erc721CustomTokensStore.setAll(tokens.map((token) => ({ data: token, certified })));
};

const loadNfts = async () => {
	// TODO load custom erc721 token/contract addresses

	const contractAddress = '0x3af2a97414d1101e2107a70e7f33955da1346305';
	const myWalletAddress = '0x29469395eaf6f95920e59f858042f0e28d98a20b';

	const etherscanProvider = etherscanProviders(ETHEREUM_NETWORK.id);
	const infuraProvider = new InfuraERC721Provider(ETHEREUM_NETWORK.providers.infura);

	try {
		const tokenIds = await etherscanProvider.erc721TokenInventory({
			address: myWalletAddress,
			contractAddress
		});
		const nfts: Nft[] = await loadNftMetadata({ infuraProvider, contractAddress, tokenIds });
		nftStore.addAll(nfts);
	} catch (err: unknown) {
		nftStore.resetAll();

		toastsError({
			msg: { text: 'Failed' },
			err
		});
	}
};

const loadNftMetadata = async ({
	infuraProvider,
	contractAddress,
	tokenIds
}: {
	infuraProvider: InfuraERC721Provider;
	contractAddress: Address;
	tokenIds: number[];
}) => {
	const nfts: Nft[] = [];

	for (let i = 0; i < tokenIds.length; i++) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		nfts.push(await infuraProvider.getNftMetadata(contractAddress, tokenIds[i]));
	}

	return nfts;
};

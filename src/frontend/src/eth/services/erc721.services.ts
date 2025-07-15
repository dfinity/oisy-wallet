import type { CustomToken, Erc721Token } from '$declarations/backend/backend.did';
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { etherscanProviders, type EtherscanProvider } from '$eth/providers/etherscan.providers';
import {
	InfuraErc721Provider,
	infuraErc721Providers
} from '$eth/providers/infura-erc721.providers';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { getIdbEthTokens, setIdbEthTokens } from '$lib/api/idb-tokens.api';
import { loadNetworkCustomTokens } from '$lib/services/custom-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import { nftStore } from '$lib/stores/nft.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { Nft } from '$lib/types/nft';
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
		identity
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
						decimals: 0, // Erc721 contracts don't have decimals, but to avoid unexpected behavior, we set it to 0
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
	loadNfts(tokens);
};

const loadNfts = (tokens: Erc721CustomToken[]) => {
	const etherscanProvider = etherscanProviders(ETHEREUM_NETWORK.id);
	const infuraProvider = new InfuraErc721Provider(ETHEREUM_NETWORK.providers.infura);

	tokens.forEach((token) => loadNftsForContract({ etherscanProvider, infuraProvider, token }));
};

const loadNftsForContract = async ({
	etherscanProvider,
	infuraProvider,
	token
}: {
	etherscanProvider: EtherscanProvider;
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
}) => {
	const myWalletAddress = '0x29469395eaf6f95920e59f858042f0e28d98a20b'; // TODO remove this and load own wallet address

	try {
		const tokenIds = await etherscanProvider.erc721TokenInventory({
			address: myWalletAddress,
			contractAddress: token.address
		});

		const loadedTokenIds = nftStore.getTokenIds(token.address);
		const tokenIdsToLoad = tokenIds.filter((id: number) => !loadedTokenIds.includes(id));

		const batchSize = 10;
		const tokenIdBatches = Array.from(
			{ length: Math.ceil(tokenIdsToLoad.length / batchSize) },
			(_, index) => tokenIdsToLoad.slice(index * batchSize, (index + 1) * batchSize)
		);

		for (const tokenIds of tokenIdBatches) {
			const nfts: Nft[] = await loadNftMetadataBatch({ infuraProvider, token, tokenIds });
			nftStore.addAll(nfts);
		}
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).init.error.nft_loading },
			err
		});
	}
};

const loadNftMetadataBatch = async ({
	infuraProvider,
	token,
	tokenIds
}: {
	infuraProvider: InfuraErc721Provider;
	token: Erc721CustomToken;
	tokenIds: number[];
}) => {
	const nfts: Nft[] = [];

	for (let i = 0; i < tokenIds.length; i++) {
		await new Promise((resolve) => setTimeout(resolve, 200));
		const nft: Nft = {
			...(await infuraProvider.getNftMetadata({
				token,
				tokenId: tokenIds[i]
			}))
		};
		nfts.push(nft);
	}

	return nfts;
};

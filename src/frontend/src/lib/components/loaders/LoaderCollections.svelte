<script lang="ts">
	import type { Identity } from '@dfinity/agent';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import type { CustomToken } from '$declarations/backend/declarations/backend.did';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveCustomTokens as saveErc1155CustomTokens } from '$eth/services/erc1155-custom-tokens.services';
	import { saveCustomTokens as saveErc721CustomTokens } from '$eth/services/erc721-custom-tokens.services';
	import type { SaveErc1155CustomToken } from '$eth/types/erc1155-custom-token';
	import type { SaveErc721CustomToken } from '$eth/types/erc721-custom-token';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { listCustomTokens } from '$lib/api/backend.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OwnedContract } from '$lib/types/nft';
	import type { NonEmptyArray } from '$lib/types/utils';
	import { areAddressesEqual } from '$lib/utils/address.utils';

	const handleErcTokens = async ({
		contracts,
		customTokens,
		network,
		identity
	}: {
		contracts: OwnedContract[];
		customTokens: CustomToken[];
		network: EthereumNetwork;
		identity: Identity;
	}) => {
		const [erc721Tokens, erc1155Tokens] = contracts.reduce<
			[SaveErc721CustomToken[], SaveErc1155CustomToken[]]
		>(
			(acc, { standard: rawStandard, address }) => {
				const [erc721TokensAcc, erc1155TokensAcc] = acc;

				const standard = rawStandard.toLowerCase();

				if (standard === 'erc721') {
					const existingToken = customTokens.find(({ token }) => {
						if (!('Erc721' in token)) {
							return false;
						}

						const {
							Erc721: { token_address: tokenAddress, chain_id: tokenChainId }
						} = token;

						return (
							areAddressesEqual({
								address1: tokenAddress,
								address2: address,
								networkId: network.id
							}) && tokenChainId === network.chainId
						);
					});

					if (nonNullish(existingToken)) {
						return acc;
					}

					const newToken: SaveErc721CustomToken = {
						address,
						network,
						enabled: true
					};

					erc721TokensAcc.push(newToken);

					return [erc721TokensAcc, erc1155TokensAcc];
				}

				if (standard === 'erc1155') {
					const existingToken = customTokens.find(({ token }) => {
						if (!('Erc1155' in token)) {
							return false;
						}

						const {
							Erc1155: { token_address: tokenAddress, chain_id: tokenChainId }
						} = token;

						return (
							areAddressesEqual({
								address1: tokenAddress,
								address2: address,
								networkId: network.id
							}) && tokenChainId === network.chainId
						);
					});

					if (nonNullish(existingToken)) {
						return acc;
					}

					const newToken: SaveErc1155CustomToken = {
						address,
						network,
						enabled: true
					};

					erc1155TokensAcc.push(newToken);

					return [erc721TokensAcc, erc1155TokensAcc];
				}

				return acc;
			},
			[[], []]
		);

		await Promise.all([
			erc721Tokens.length > 0 &&
				saveErc721CustomTokens({
					tokens: erc721Tokens as NonEmptyArray<SaveErc721CustomToken>,
					identity
				}),
			erc1155Tokens.length > 0 &&
				( saveErc1155CustomTokens({
					tokens: erc1155Tokens as NonEmptyArray<SaveErc1155CustomToken>,
					identity
				}))
		]);
	};

	const loadContracts = async (network: EthereumNetwork): Promise<OwnedContract[]> => {
		if (isNullish($ethAddress)) {
			return [];
		}

		const { getTokensForOwner } = alchemyProviders(network.id);

		try {
			return await getTokensForOwner($ethAddress);
		} catch (_: unknown) {
			return [];
		}
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($authIdentity)) {
			return;
		}

		const customTokens = await listCustomTokens({
			identity: $authIdentity,
			certified: true,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});

		const networks = [...$enabledEthereumNetworks, ...$enabledEvmNetworks];
		for (const network of networks) {
			const contracts: OwnedContract[] = await loadContracts(network);

			await handleErcTokens({
				contracts,
				customTokens,
				network,
				identity: $authIdentity
			});
		}
	};
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad} />

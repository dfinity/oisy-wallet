<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import type { TokenIndex } from '$declarations/ext_v2_token/ext_v2_token.did';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { EXT_BUILTIN_TOKENS } from '$env/tokens/tokens-ext/tokens.ext.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveErcCustomTokens } from '$eth/services/erc-custom-tokens.services';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { getTokensByOwner } from '$icp/api/ext-v2-token.api';
	import { listCustomTokens } from '$lib/api/backend.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { COLLECTION_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { OwnedContract } from '$lib/types/nft';

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

	const loadErcTokens = async () => {
		if (isNullish($authIdentity)) {
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

			await saveErcCustomTokens({
				contracts,
				customTokens,
				network,
				identity: $authIdentity
			});
		}
	};

	const loadExtTokens = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const tokens = await EXT_BUILTIN_TOKENS.reduce<Promise<Record<CanisterIdText, TokenIndex[]>>>(
			async (acc, { canisterId }) => {
				if (isNullish($authIdentity)) {
					return await acc;
				}

				try {
					const tokens = await getTokensByOwner({
						identity: $authIdentity,
						owner: $authIdentity.getPrincipal(),
						canisterId
					});

					return tokens.length > 0 ? {...(await acc), [canisterId]: tokens} : await acc;
				} catch (error: unknown) {
					console.warn(`Error fetching tokens from canister ${canisterId}:`, error);

					return await acc;
				}
			},
			Promise.resolve({})
		);

		console.log('Loaded tokens from external canisters:', tokens);

		// await saveExtCustomTokens({
		// 	identity: $authIdentity,
		// 	tokens: tokens as NonEmptyArray<SaveExtCustomToken>
		// });
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED) {
			return;
		}

		await Promise.all([loadErcTokens(), loadExtTokens()]);
	};
</script>

<IntervalLoader interval={COLLECTION_TIMER_INTERVAL_MILLIS} {onLoad} />

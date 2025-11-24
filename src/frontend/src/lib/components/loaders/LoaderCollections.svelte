<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { get } from 'svelte/store';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
	import { alchemyProviders } from '$eth/providers/alchemy.providers';
	import { saveErcCustomTokens } from '$eth/services/erc-custom-tokens.services';
	import type { EthereumNetwork } from '$eth/types/network';
	import { enabledEvmNetworks } from '$evm/derived/networks.derived';
	import { listCustomTokens } from '$lib/api/backend.api';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { COLLECTION_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
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

			await saveErcCustomTokens({
				contracts,
				customTokens,
				network,
				identity: $authIdentity
			});
		}
	};
</script>

<IntervalLoader interval={COLLECTION_TIMER_INTERVAL_MILLIS} {onLoad} />

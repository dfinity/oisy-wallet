<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { loadNftsByNetwork } from '$eth/services/nft.services';
	import type { EthNonFungibleToken } from '$eth/types/nft';
	import { loadNfts as loadExtNfts } from '$icp/services/nft.services';
	import type { IcNonFungibleToken } from '$icp/types/nft';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import { isNetworkIdEthereum, isNetworkIdEvm , isNetworkIdICP } from '$lib/utils/network.utils';
		import { getTokensByNetwork } from '$lib/utils/nft.utils';

	const loadNfts = async ({
		networkId,
		tokens
	}: {
		networkId: NetworkId;
		tokens: NonFungibleToken[];
	}): Promise<Nft[]> => {
		if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
			return await loadNftsByNetwork({
				networkId,
				// For now, it is acceptable to cast it since we checked before if the network is Ethereum or EVM.
				tokens: tokens as EthNonFungibleToken[],
				walletAddress: $ethAddress
			});
		}

		if (isNetworkIdICP(networkId)) {
			return await loadExtNfts({
				// For now, it is acceptable to cast it since we checked before if the network is ICP.
				tokens: tokens as IcNonFungibleToken[],
				identity: $authIdentity
			});
		}

		return [];
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($ethAddress)) {
			return;
		}

		const tokensByNetwork = getTokensByNetwork($enabledNonFungibleTokens);

		const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
			const nfts = await loadNfts({ networkId, tokens });

			if (nfts.length === 0) {
				return;
			}

			nftStore.setAllByNetwork({ networkId, nfts });
		});

		await Promise.allSettled(promises);
	};

	const debounceLoad = debounce(onLoad);

	$effect(() => {
		[$enabledNonFungibleTokens, NFTS_ENABLED, $ethAddress];

		untrack(() => debounceLoad());
	});
</script>

<IntervalLoader interval={NFT_TIMER_INTERVAL_MILLIS} {onLoad} skipInitialLoad={true} />

<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { NFTS_ENABLED } from '$env/nft.env';
	import { loadNftsByNetwork } from '$eth/services/nft.services';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import { NFT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
	import { nftStore } from '$lib/stores/nft.store';
	import { getTokensByNetwork } from '$lib/utils/nft.utils';

	const loadEthNfts = async () => {
		if (isNullish($ethAddress)) {
			return;
		}

		const tokensByNetwork = getTokensByNetwork($enabledNonFungibleTokens);

		const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
			const nfts = await loadNftsByNetwork({ networkId, tokens, walletAddress: $ethAddress });

			nftStore.setAllByNetwork({ networkId, nfts });
		});

		await Promise.allSettled(promises);
	};

	const onLoad = async () => {
		if (!NFTS_ENABLED || isNullish($ethAddress)) {
			return;
		}

		const tokensByNetwork = getTokensByNetwork($enabledNonFungibleTokens);

		const promises = Array.from(tokensByNetwork).map(async ([networkId, tokens]) => {
			const nfts = await loadNftsByNetwork({ networkId, tokens, walletAddress: $ethAddress });

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

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { setContext, type Snippet } from 'svelte';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext,
		icTokenFeeStore
	} from '$icp/stores/ic-token-fee.store';
	import {
		crossChainSwapNetworksMainnets,
		crossChainSwapNetworksMainnetsIds
	} from '$lib/derived/cross-chain-networks.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { swappableTokens } from '$lib/derived/swap.derived';
	import {
		initModalNetworksListContext,
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		type ModalNetworksListContext
	} from '$lib/stores/modal-networks-list.store';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import {
		initSwapAmountsStore,
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore()
	});

	setContext<SwapContext>(
		SWAP_CONTEXT_KEY,
		initSwapContext({
			sourceToken: $swappableTokens.sourceToken,
			destinationToken: $swappableTokens.destinationToken
		})
	);

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: [],
			filterNetwork:
				nonNullish($selectedNetwork) &&
				$crossChainSwapNetworksMainnetsIds.includes($selectedNetwork.id)
					? $selectedNetwork
					: undefined,
			filterNetworksIds: $crossChainSwapNetworksMainnetsIds
		})
	);

	setContext<ModalNetworksListContext>(
		MODAL_NETWORKS_LIST_CONTEXT_KEY,
		initModalNetworksListContext({
			networks: $crossChainSwapNetworksMainnets
		})
	);

	setContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY, {
		store: icTokenFeeStore
	});
</script>

{@render children()}

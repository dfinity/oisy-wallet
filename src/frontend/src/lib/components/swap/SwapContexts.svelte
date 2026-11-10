<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { setContext, untrack, type Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext,
		icTokenFeeStore
	} from '$icp/stores/ic-token-fee.store';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { crossChainSwapNetworksMainnets } from '$lib/derived/cross-chain-networks.derived';
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
	import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
	import { initSwapContext, SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const swapContext = initSwapContext();
	setContext<SwapContext>(SWAP_CONTEXT_KEY, swapContext);

	setContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY, {
		store: initSwapAmountsStore({ amountSetToMax: swapContext.amountSetToMax }),
		activity: initSwapQuoteActivityStore()
	});

	const { destinationToken, receiveSupportedData, setDestinationToken } = swapContext;

	// Re-evaluate the destination whenever the source or provider data changes (i.e. when
	// `receiveSupportedData` re-derives). If the previously chosen destination is no longer
	// reachable, clear it. The current destination is read non-reactively so picking a new
	// destination doesn't re-trigger this effect.
	$effect(() => {
		const supportedData = $receiveSupportedData;

		if (isNullish(supportedData)) {
			return;
		}

		const dest = get(destinationToken);

		if (isNullish(dest)) {
			return;
		}

		const stillReachable =
			filterSwapTokens({
				tokens: [{ ...dest, enabled: true }],
				supportedData
			}).length > 0;

		if (!stillReachable) {
			setDestinationToken(undefined);
		}
	});

	let availableNetworks = $derived(MOBILE_SHELL ? [ICP_NETWORK] : $crossChainSwapNetworksMainnets);
	let availableNetworkIds = $derived(availableNetworks.map(({ id }) => id));

	// Each list's initial filters are owned by SwapModalWizardSteps.
	const tokensListContext = initModalTokensListContext({
		tokens: [],
		filterNetworksIds: untrack(() => availableNetworkIds)
	});

	setContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY, tokensListContext);

	const networksListContext = initModalNetworksListContext({
		networks: untrack(() => availableNetworks)
	});

	setContext<ModalNetworksListContext>(MODAL_NETWORKS_LIST_CONTEXT_KEY, networksListContext);

	$effect(() => {
		networksListContext.setNetworks(availableNetworks);
	});

	$effect(() => {
		tokensListContext.setFilterNetworksIds(availableNetworkIds);
	});

	setContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY, {
		store: icTokenFeeStore
	});
</script>

{@render children()}

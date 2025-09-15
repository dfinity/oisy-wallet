<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token, TokenId } from '$lib/types/token';

	interface Props {
		token: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);

	const feeDecimalsStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(token.symbol);
		feeTokenIdStore.set(token.id);
		feeDecimalsStore.set(token.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[token.id]?.usd);
	});

	setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore
		})
	);
</script>

{@render children()}

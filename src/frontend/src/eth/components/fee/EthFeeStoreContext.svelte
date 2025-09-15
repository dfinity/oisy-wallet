<script lang="ts">
	import { type Snippet, setContext } from 'svelte';
	import { run } from 'svelte/legacy';
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
		children?: Snippet;
	}

	let { token, children }: Props = $props();

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	run(() => {
		feeSymbolStore.set(token.symbol);
	});

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	run(() => {
		feeTokenIdStore.set(token.id);
	});

	const feeDecimalsStore = writable<number | undefined>(undefined);
	run(() => {
		feeDecimalsStore.set(token.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);
	run(() => {
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

{@render children?.()}

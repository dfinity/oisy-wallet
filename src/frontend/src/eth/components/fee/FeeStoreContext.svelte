<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token, TokenId } from '$lib/types/token';

	export let token: Token;

	const feeStore = initFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set(token.symbol);

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set(token.id);

	const feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set(token.decimals);

	const feeExchangeRateStore = writable<number | undefined>(undefined);
	$: feeExchangeRateStore.set($exchanges?.[token.id]?.usd);

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore
		})
	);
</script>

<slot />

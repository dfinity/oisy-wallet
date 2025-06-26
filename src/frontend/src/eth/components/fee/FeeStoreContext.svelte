<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token, TokenId } from '$lib/types/token';

	export let token: Token;

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set(token.symbol);

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set(token.id);

	const feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set(token.decimals);

	const feeExchangeRateStore = writable<number | undefined>(undefined);
	$: feeExchangeRateStore.set($exchanges?.[token.id]?.usd);

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

<slot />

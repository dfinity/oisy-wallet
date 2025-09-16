<script lang="ts">
	import { isNullish } from '@dfinity/utils';
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
	import { isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';

	interface Props {
		token?: Token;
		children: Snippet;
	}

	let { token, children }: Props = $props();

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);

	const feeDecimalsStore = writable<number | undefined>(undefined);

	const feeExchangeRateStore = writable<number | undefined>(undefined);

	let networkId = $derived(token?.network.id);

	let isEthNetwork = $derived(isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId));

	const reset = () => {
		feeSymbolStore.set(undefined);
		feeTokenIdStore.set(undefined);
		feeDecimalsStore.set(undefined);
		feeExchangeRateStore.set(undefined);
	};

	$effect(() => {
		if (!isEthNetwork || isNullish(token)) {
			return;
		}


		feeSymbolStore.set(token.symbol);
		feeTokenIdStore.set(token.id);
		feeDecimalsStore.set(token.decimals);
	});

	$effect(() => {
        if (!isEthNetwork || isNullish(token)) {
            return;
        }

		feeExchangeRateStore.set($exchanges?.[token.id]?.usd);
	});

	$effect(() => {
		if (!isEthNetwork) {
			reset();
		}
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

<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { fetchSwapOptions } from '$lib/utils/swap.utils';

	export let amount: OptionAmount = undefined;
	export let sourceToken: Token | undefined;
	export let destinationToken: Token | undefined;

	const { store } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const loadSwapAmounts = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(amount) || isNullish(sourceToken) || isNullish(destinationToken)) {
			store.reset();
			return;
		}

		const parsedAmount = Number(amount);

		if (nonNullish($store) && $store.amountForSwap === parsedAmount) {
			return;
		}

		try {
			const swaps = await fetchSwapOptions({
				identity: $authIdentity,
				sourceToken,
				destinationToken,
				amount: parsedAmount,
				tokens: $tokens
			});

			console.log('swaps', swaps);

			if (swaps.length === 0) {
				store.reset();
				return;
			}

			const filteredSwaps = swaps.filter((swap) => Number(swap.receiveAmount) > 0);

			store.setSwaps({ swaps: filteredSwaps, amount: parsedAmount });
		} catch {
			store.reset();
		}
	};

	const debounceLoadSwapAmounts = debounce(loadSwapAmounts);

	$: amount, sourceToken, destinationToken, debounceLoadSwapAmounts();
</script>

<slot />

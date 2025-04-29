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
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import type { IcToken } from '$icp/types/ic-token';

	export let amount: OptionAmount = undefined;
	export let sourceToken: IcToken | undefined;
	export let destinationToken: IcToken | undefined;
	export let slippageValue: OptionAmount;

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
			const swapAmounts = await fetchSwapAmounts({
				identity: $authIdentity,
				sourceToken,
				destinationToken,
				amount: parsedAmount,
				tokens: $tokens,
				slippage: slippageValue,
			});

			console.log(swapAmounts, 'swapAmounts');

			if (swapAmounts.length === 0) {
				store.reset();
				return;
			}

			const filteredSwaps = swapAmounts
				.filter((swap) => Number(swap.receiveAmount) > 0)
				.sort((a, b) => Number(b.receiveAmount) - Number(a.receiveAmount));

			store.setSwaps({ swaps: filteredSwaps, amount: parsedAmount });
		} catch {
			store.reset();
		}
	};

	const debounceLoadSwapAmounts = debounce(loadSwapAmounts);

	$: amount, sourceToken, destinationToken, debounceLoadSwapAmounts();
</script>

<slot />

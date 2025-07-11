<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, onMount, type Snippet } from 'svelte';
	import type { IcToken } from '$icp/types/ic-token';
	import { SWAP_DEFAULT_SLIPPAGE_VALUE } from '$lib/constants/swap.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { type Token } from '$lib/types/token';
	import { ethAddress } from '$lib/derived/address.derived';

	interface Props {
		amount: OptionAmount;
		sourceToken: Token | IcToken | undefined;
		destinationToken: Token | IcToken | undefined;
		slippageValue: OptionAmount;
		children?: Snippet;
	}

	let { amount, sourceToken, destinationToken, slippageValue, children }: Props = $props();

	const { store } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let intervalId: ReturnType<typeof setInterval> | undefined;

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

		// // WizardModal re-renders content on step change (e.g. when switching between Swap to Review steps)
		// // To avoid re-fetching the fees, we need to check if amount hasn't changed since the last request
		// if (nonNullish($store) && $store.amountForSwap === parsedAmount) {
		// 	return;
		// }

		try {
			const swapAmounts = await fetchSwapAmounts({
				identity: $authIdentity,
				sourceToken: sourceToken,
				destinationToken: destinationToken,
				amount,
				tokens: $tokens,
				slippage: slippageValue ?? SWAP_DEFAULT_SLIPPAGE_VALUE,
				userAddress: $ethAddress
			});

			console.log({swapAmounts});
			

			if (swapAmounts.length === 0) {
				store.reset();
				return;
			}

			store.setSwaps({
				swaps: swapAmounts,
				amountForSwap: parsedAmount,
				selectedProvider: swapAmounts[0]
			});
		} catch (_err: unknown) {
			// if kongSwapAmounts fails, it means no pool is currently available for the provided tokens
			store.setSwaps({
				swaps: [],
				amountForSwap: parsedAmount,
				selectedProvider: undefined
			});
		}
	};
	const debounceLoadSwapAmounts = debounce(loadSwapAmounts);

	$effect(() => {
		[amount, sourceToken, destinationToken];
		debounceLoadSwapAmounts();
	});

	onMount(() => {
		intervalId = setInterval(() => {
			loadSwapAmounts();
		}, 5000);
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});
</script>

{@render children?.()}

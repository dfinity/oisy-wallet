<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, type Snippet } from 'svelte';
	import {
		SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
		SWAP_DEFAULT_SLIPPAGE_VALUE
	} from '$lib/constants/swap.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		amount: OptionAmount;
		sourceToken?: Token;
		destinationToken?: Token;
		slippageValue: OptionAmount;
		children?: Snippet;
		isSwapAmountsLoading: boolean;
		enableAmountUpdates?: boolean;
		pauseAmountUpdates?: boolean;
		isIcrcTokenIcrc2?: boolean;
	}

	let {
		amount,
		sourceToken,
		destinationToken,
		slippageValue,
		children,
		isIcrcTokenIcrc2,
		isSwapAmountsLoading = $bindable(false),
		enableAmountUpdates = true,
		pauseAmountUpdates = false
	}: Props = $props();

	const { store } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let timer: NodeJS.Timeout | undefined;
	let debounceTimer: NodeJS.Timeout | undefined;

	const clearTimer = () => {
		if (nonNullish(timer)) {
			clearInterval(timer);
			timer = undefined;
		}
	};

	const clearDebounceTimer = () => {
		if (nonNullish(debounceTimer)) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
	};

	const startTimer = () => {
		if (nonNullish(timer) || !enableAmountUpdates || pauseAmountUpdates) {
			return;
		}

		timer = setInterval(() => {
			loadSwapAmounts(true);
		}, SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);
	};

	const loadSwapAmounts = async (isPeriodicUpdate = false) => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (isNullish(amount) || isNullish(sourceToken) || isNullish(destinationToken)) {
			store.reset();
			return;
		}

		const parsedAmount = Number(amount);

		if (!isPeriodicUpdate && nonNullish($store) && $store.amountForSwap === parsedAmount) {
			return;
		}

		isSwapAmountsLoading = true;

		console.log({ isIcrcTokenIcrc2 }, 'inSwapContext');

		try {
			const swapAmounts = await fetchSwapAmounts({
				identity: $authIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: $tokens,
				isIcrcTokenIcrc2,
				slippage: slippageValue ?? SWAP_DEFAULT_SLIPPAGE_VALUE,
				userEthAddress: $ethAddress
			});

			if (swapAmounts.length === 0) {
				store.setSwaps({
					swaps: [],
					amountForSwap: parsedAmount,
					selectedProvider: undefined
				});
				return;
			}

			store.setSwaps({
				swaps: swapAmounts,
				amountForSwap: parsedAmount,
				selectedProvider: swapAmounts[0]
			});
		} catch (_err: unknown) {
			store.setSwaps({
				swaps: [],
				amountForSwap: parsedAmount,
				selectedProvider: undefined
			});
		} finally {
			isSwapAmountsLoading = false;
		}
	};

	$effect(() => {
		if (pauseAmountUpdates || !enableAmountUpdates) {
			clearTimer();
		} else {
			startTimer();
		}
	});

	$effect(() => {
		[amount, sourceToken, destinationToken];

		clearDebounceTimer();

		debounceTimer = setTimeout(() => {
			loadSwapAmounts(false);
		}, 300);
	});

	onDestroy(() => {
		clearTimer();
		clearDebounceTimer();
	});
</script>

{@render children?.()}

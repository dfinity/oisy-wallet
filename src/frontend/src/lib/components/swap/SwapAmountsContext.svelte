<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, untrack, type Snippet } from 'svelte';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import {
		SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
		SWAP_DEFAULT_SLIPPAGE_VALUE
	} from '$lib/constants/swap.constants';
	import { btcAddressMainnet, ethAddress, solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SwapAmountTooLowError } from '$lib/types/errors';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';

	interface Props {
		amount: OptionAmount;
		sourceToken?: Token;
		destinationToken?: Token;
		slippageValue: OptionAmount;
		children?: Snippet;
		isSourceTokenIcrc2?: boolean;
		isSwapAmountsLoading: boolean;
		enableAmountUpdates?: boolean;
		pauseAmountUpdates?: boolean;
	}

	let {
		amount,
		sourceToken,
		destinationToken,
		slippageValue,
		children,
		isSourceTokenIcrc2,
		isSwapAmountsLoading = $bindable(false),
		enableAmountUpdates = true,
		pauseAmountUpdates = false
	}: Props = $props();

	const { store } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let timer: NodeJS.Timeout | undefined;
	let debounceTimer = $state<NodeJS.Timeout | undefined>();
	let fetchGeneration = 0;

	const clearTimer = () => {
		if (nonNullish(timer)) {
			clearInterval(timer);
			timer = undefined;
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

	const clearDebounceTimer = () => {
		if (nonNullish(debounceTimer)) {
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
		}
	};

	const loadSwapAmounts = async (isPeriodicUpdate = false) => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (isNullish(amount) || isNullish(sourceToken) || isNullish(destinationToken)) {
			store.reset();
			return;
		}

		const parsedAmount = Number(amount);

		if (isNullish(isSourceTokenIcrc2) && isIcToken(sourceToken)) {
			return;
		}

		if (!isPeriodicUpdate && nonNullish($store) && $store.amountForSwap === parsedAmount) {
			return;
		}

		const currentGeneration = fetchGeneration;

		isSwapAmountsLoading = true;

		try {
			const swapAmounts = await fetchSwapAmounts({
				identity: $authIdentity,
				sourceToken,
				destinationToken,
				amount,
				tokens: $tokens,
				slippage: slippageValue ?? SWAP_DEFAULT_SLIPPAGE_VALUE,
				isSourceTokenIcrc2,
				userEthAddress: $ethAddress,
				userSolAddress: $solAddressMainnet,
				userBtcAddress: $btcAddressMainnet
			});

			if (currentGeneration !== fetchGeneration) {
				return;
			}

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
		} catch (err: unknown) {
			if (currentGeneration !== fetchGeneration) {
				return;
			}

			// Any fetch failure (no pool for the pair, provider or network error) surfaces as
			// "no offers". A provider that refused the amount as below its minimum names the
			// reason, which the form surfaces instead of the generic "swap is not offered".
			store.setSwaps({
				swaps: [],
				amountForSwap: parsedAmount,
				selectedProvider: undefined,
				...(err instanceof SwapAmountTooLowError && {
					quoteError: { type: 'amount-too-low', minAmount: err.minAmount }
				})
			});
		} finally {
			if (currentGeneration === fetchGeneration) {
				isSwapAmountsLoading = false;
			}
		}
	};

	$effect(() => {
		if (pauseAmountUpdates || !enableAmountUpdates) {
			fetchGeneration++;
			isSwapAmountsLoading = false;
			untrack(clearDebounceTimer);
			clearTimer();
		} else {
			startTimer();
		}
	});

	$effect(() => {
		[amount, sourceToken, destinationToken, isSourceTokenIcrc2];

		untrack(() => {
			fetchGeneration++;
			clearDebounceTimer();
			debounceTimer = setTimeout(() => {
				loadSwapAmounts(false);
			}, 300);
		});
	});

	onDestroy(() => {
		fetchGeneration++;
		clearTimer();
		clearDebounceTimer();
	});
</script>

{@render children?.()}

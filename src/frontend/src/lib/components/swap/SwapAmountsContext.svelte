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
	import { fetchNearIntentsSwapLimit } from '$lib/services/near-intents.services';
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SwapAmountTooLowError } from '$lib/types/errors';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';

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

			// A real refusal carries the same fiat floor the probe looks for, so it is recorded
			// too. The form leaves this case to the standing notice instead of repeating it in
			// red, and that notice must not be missing because a probe happened to fail.
			if (err instanceof SwapAmountTooLowError && err.minimum?.type === 'usd') {
				nearIntentsSwapLimitStore.set(err.minimum.value);
			}

			// Any fetch failure (no pool for the pair, provider or network error) surfaces as
			// "no offers". A provider that refused the amount as below its minimum names the
			// reason, which the form surfaces instead of the generic "swap is not offered".
			store.setSwaps({
				swaps: [],
				amountForSwap: parsedAmount,
				selectedProvider: undefined,
				...(err instanceof SwapAmountTooLowError && {
					quoteError: { type: 'amount-too-low', minimum: err.minimum }
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

	// The provider's fiat floor depends on the pair alone, so it is loaded on its own rather
	// than inside loadSwapAmounts, which repeats every few seconds while an amount is entered.
	let limitGeneration = 0;

	const loadSwapLimit = async ({ source, destination }: { source: Token; destination: Token }) => {
		const currentGeneration = ++limitGeneration;

		nearIntentsSwapLimitStore.reset();

		try {
			const limit = await fetchNearIntentsSwapLimit({
				sourceToken: source,
				destinationToken: destination
			});

			if (currentGeneration === limitGeneration) {
				nearIntentsSwapLimitStore.set(limit);
			}
		} catch (_err: unknown) {
			// A floor we could not read is shown as no floor; the quote round still refuses a
			// too-small amount and names it.
		}
	};

	// Keyed on the pair itself rather than on the effect's dependencies: the effect re-runs
	// whenever any prop changes, including on every keystroke in the amount field, and
	// re-probing would reset the store and flicker the hint away for no reason.
	let probedPair: [TokenId, TokenId] | undefined;

	$effect(() => {
		const [source, destination] = [sourceToken, destinationToken];

		untrack(() => {
			if (isNullish(source) || isNullish(destination)) {
				limitGeneration++;
				probedPair = undefined;
				nearIntentsSwapLimitStore.reset();
				return;
			}

			if (probedPair?.[0] === source.id && probedPair?.[1] === destination.id) {
				return;
			}

			probedPair = [source.id, destination.id];

			loadSwapLimit({ source, destination });
		});
	});

	onDestroy(() => {
		fetchGeneration++;
		limitGeneration++;
		clearTimer();
		clearDebounceTimer();
		nearIntentsSwapLimitStore.reset();
	});
</script>

{@render children?.()}

<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy, untrack, type Snippet } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { isIcToken } from '$icp/validation/ic-token.validation';
	import {
		SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
		SWAP_DEFAULT_SLIPPAGE_VALUE,
		SWAP_PROVIDER_MIN_COMPARISON_MS
	} from '$lib/constants/swap.constants';
	import {
		btcAddressMainnet,
		ethAddress,
		solAddressMainnet,
		xrpAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { fetchSwapAmounts } from '$lib/services/swap.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SwapAmountTooLowError, SwapViaIntermediateTokenError } from '$lib/types/errors';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapProvider } from '$lib/types/swap';
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

	const { store, activity } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const sourceTokenId = $derived(sourceToken?.id);
	const destinationTokenId = $derived(destinationToken?.id);

	let timer: NodeJS.Timeout | undefined;
	let debounceTimer = $state<NodeJS.Timeout | undefined>();
	let fetchGeneration = 0;
	let requestSequence = 0;
	let currentRequest: { requestId: number; background: boolean } | undefined;
	let destroyed = false;

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

	const invalidateRequest = (discardForegroundQuote = false) => {
		// A cancelled foreground round leaves the retained offers priced for old inputs.
		// Background work, unlike foreground work, may still have a usable accepted quote.
		if (discardForegroundQuote && currentRequest?.background === false) {
			store.reset();
		}
		fetchGeneration++;
		currentRequest = undefined;
		activity?.reset();
		isSwapAmountsLoading = false;
		clearDebounceTimer();
	};

	const loadSwapAmounts = async (isPeriodicUpdate = false) => {
		if (destroyed || pauseAmountUpdates || isNullish($authIdentity)) {
			return;
		}

		// Do not overlap refreshes for the same inputs or race the foreground debounce.
		if (isPeriodicUpdate && (nonNullish(currentRequest) || nonNullish(debounceTimer))) {
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

		const currentGeneration = fetchGeneration;
		// A foreground round already owns its identity while queued in the debounce.
		const requestId = isPeriodicUpdate
			? ++requestSequence
			: (currentRequest?.requestId ?? ++requestSequence);
		currentRequest = { requestId, background: isPeriodicUpdate };
		const isCurrentRequest = () =>
			!destroyed &&
			!pauseAmountUpdates &&
			nonNullish($authIdentity) &&
			currentGeneration === fetchGeneration &&
			currentRequest?.requestId === requestId;
		if (isPeriodicUpdate) {
			activity?.start({ requestId, background: true });
		}

		// Fast or cached quotes would reveal the winner before the provider scroll reaches a
		// second name, so a foreground comparison stays up for a minimum time, failures included.
		// One participant is enough: the scroll fills the wait with OISY's provider pool. Reduced
		// motion draws no scroll, so there is nothing to hold for.
		let firstParticipantAt: number | undefined;
		const participants: SwapProvider[] = [];
		const holdComparison = async () => {
			const holdMs =
				isPeriodicUpdate ||
				participants.length === 0 ||
				isNullish(firstParticipantAt) ||
				prefersReducedMotion.current
					? 0
					: firstParticipantAt + SWAP_PROVIDER_MIN_COMPARISON_MS - Date.now();
			if (holdMs > 0 && isCurrentRequest()) {
				await new Promise((resolve) => setTimeout(resolve, holdMs));
			}
		};

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
				userBtcAddress: $btcAddressMainnet,
				userXrpAddress: $xrpAddressMainnet,
				onProviderParticipating: (provider) => {
					if (isCurrentRequest()) {
						firstParticipantAt ??= Date.now();
						if (!participants.includes(provider)) {
							participants.push(provider);
						}
						activity?.addProvider({ requestId, provider });
					}
				}
			}).finally(holdComparison);

			if (!isCurrentRequest()) {
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
			if (!isCurrentRequest()) {
				return;
			}

			// Any fetch failure (no pool for the pair, provider or network error) surfaces as
			// "no offers". A provider that refused the amount as below its minimum names the
			// reason, which the form surfaces instead of the generic "swap is not offered"; one
			// whose route goes through a token OISY lists names that token, for the form to point
			// to the two separate swaps through it.
			store.setSwaps({
				swaps: [],
				amountForSwap: parsedAmount,
				selectedProvider: undefined,
				...(err instanceof SwapAmountTooLowError && {
					quoteError: { type: 'amount-too-low', minAmount: err.minAmount }
				}),
				...(err instanceof SwapViaIntermediateTokenError && {
					quoteError: {
						type: 'two-swaps',
						intermediateToken: err.intermediateToken,
						provider: err.provider
					}
				})
			});
		} finally {
			if (isCurrentRequest()) {
				activity?.complete({ requestId });
				currentRequest = undefined;
				isSwapAmountsLoading = false;
				// The refresh clock restarts with a fresh foreground quote, so the next background
				// round comes a full interval later and never cuts the winner's reveal motion.
				if (!isPeriodicUpdate) {
					clearTimer();
					startTimer();
				}
			}
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
		[
			amount,
			sourceTokenId,
			destinationTokenId,
			isSourceTokenIcrc2,
			slippageValue,
			pauseAmountUpdates,
			$authIdentity
		];

		untrack(() => {
			invalidateRequest(pauseAmountUpdates);
			if (isNullish($authIdentity)) {
				store.reset();
				return;
			}
			if (pauseAmountUpdates) {
				return;
			}
			if (isNullish(amount) || isNullish(sourceToken) || isNullish(destinationToken)) {
				store.reset();
				return;
			}
			if (isNullish(isSourceTokenIcrc2) && isIcToken(sourceToken)) {
				store.reset();
				return;
			}
			// A remounted wizard may reuse its accepted quote without replaying comparison.
			if (fetchGeneration === 1 && nonNullish($store) && $store.amountForSwap === Number(amount)) {
				return;
			}
			const requestId = ++requestSequence;
			currentRequest = { requestId, background: false };
			activity?.start({ requestId, background: false });
			isSwapAmountsLoading = true;
			debounceTimer = setTimeout(() => {
				debounceTimer = undefined;
				loadSwapAmounts(false);
			}, 300);
		});
	});

	onDestroy(() => {
		destroyed = true;
		invalidateRequest(true);
		clearTimer();
	});
</script>

{@render children?.()}

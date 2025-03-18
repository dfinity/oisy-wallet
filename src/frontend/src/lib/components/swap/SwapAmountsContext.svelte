<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { kongSwapAmounts } from '$lib/api/kong_backend.api';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { tokens } from '$lib/derived/tokens.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { parseToken } from '$lib/utils/parse.utils';
	import { getLiquidityFees, getNetworkFee, getSwapRoute } from '$lib/utils/swap.utils';
	export let amount: OptionAmount = undefined;
	export let sourceToken: Token | undefined;
	export let destinationToken: Token | undefined;

	const { store } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// TODO: add tests for this context
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

		// WizardModal re-renders content on step change (e.g. when switching between Swap to Review steps)
		// To avoid re-fetching the fees, we need to check if amount hasn't changed since the last request
		if (nonNullish($store) && $store.amountForSwap === parsedAmount) {
			return;
		}

		try {
			const swapAmounts = await kongSwapAmounts({
				identity: $authIdentity,
				sourceToken,
				destinationToken,
				sourceAmount: parseToken({
					value: `${amount}`,
					unitName: sourceToken.decimals
				}).toBigInt()
			});

			if (isNullish(swapAmounts)) {
				store.reset();
				return;
			}

			store.setSwapAmounts({
				swapAmounts: {
					slippage: swapAmounts.slippage,
					receiveAmount: swapAmounts.receive_amount,
					route: getSwapRoute(swapAmounts.txs ?? []),
					liquidityFees: getLiquidityFees({ transactions: swapAmounts.txs ?? [], tokens: $tokens }),
					networkFee: getNetworkFee({ transactions: swapAmounts.txs ?? [], tokens: $tokens })
				},
				amountForSwap: parsedAmount
			});
		} catch (_err: unknown) {
			// if kongSwapAmounts fails, it means no pool is currently available for the provided tokens
			store.setSwapAmounts({
				swapAmounts: null,
				amountForSwap: parsedAmount
			});
		}
	};
	const debounceLoadSwapAmounts = debounce(loadSwapAmounts);

	$: amount, sourceToken, destinationToken, debounceLoadSwapAmounts();
</script>

<slot />

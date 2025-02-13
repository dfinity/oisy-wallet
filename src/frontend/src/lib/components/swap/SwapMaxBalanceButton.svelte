<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
	import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let swapAmount: OptionAmount;
	export let amountSetToMax = false;
	export let errorType: ConvertAmountErrorType = undefined;

	const { sourceTokenBalance, sourceToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	let sourceTokenFee: bigint | undefined;
	$: sourceTokenFee = nonNullish($sourceToken)
		? $icTokenFeeStore?.[$sourceToken.symbol]
		: undefined;

	let isZeroBalance: boolean;
	$: isZeroBalance = isNullish($sourceTokenBalance) || $sourceTokenBalance.isZero();

	let maxAmount: number | undefined;
	$: maxAmount = nonNullish($sourceToken)
		? getMaxTransactionAmount({
				balance: $sourceTokenBalance,
				fee: BigNumber.from(sourceTokenFee ?? 0n),
				tokenDecimals: $sourceToken.decimals,
				tokenStandard: $sourceToken.standard
			})
		: undefined;

	const setMax = () => {
		if (!isZeroBalance && nonNullish(maxAmount)) {
			amountSetToMax = true;
			swapAmount = maxAmount;
		}
	};

	/**
	 * Reevaluate max amount if user has used the "Max" button and sourceTokenFee is changing.
	 */
	const debounceSetMax = () => {
		if (!amountSetToMax) {
			return;
		}
		debounce(() => setMax(), 500)();
	};

	$: sourceTokenFee, debounceSetMax();
</script>

<button
	class="font-semibold text-brand-primary transition-all"
	on:click|preventDefault={setMax}
	class:text-error={isZeroBalance || nonNullish(errorType)}
	class:text-brand-primary={!isZeroBalance && isNullish(errorType)}
>
	{$i18n.swap.text.max_balance}:
	{nonNullish(maxAmount) && nonNullish($sourceToken)
		? `${maxAmount} ${$sourceToken.symbol}`
		: $i18n.swap.text.not_available}
</button>

<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
	import { IC_TOKEN_FEE_CONTEXT_KEY } from '$icp/stores/ic-token-fee.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: OptionAmount;
	export let amountSetToMax = false;
	export let errorType: ConvertAmountErrorType = undefined;
	// TODO: We want to be able to reuse this component in the send forms. Unfortunately, the send forms work with errors instead of error types. For now, this component supports errors and error types but in the future the error handling in the send forms should be reworked.
	export let error: Error | undefined = undefined;
	export let balance: OptionBalance;
	export let token: Token | undefined = undefined;
	export let isIcrc2Token: boolean | undefined = undefined;

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContext>(IC_TOKEN_FEE_CONTEXT_KEY);

	let sourceTokenFee: bigint | undefined;
	$: sourceTokenFee = nonNullish(token) ? $icTokenFeeStore?.[token.symbol] : undefined;

	let isZeroBalance: boolean;
	$: isZeroBalance = isNullish(balance) || balance.isZero();

	let maxAmount: number | undefined;
	$: maxAmount = nonNullish(token)
		? getMaxTransactionAmount({
				balance: balance ?? undefined,
				// multiply sourceTokenFee by two if it's an icrc2 token to cover transfer and approval fees
				fee: BigNumber.from((sourceTokenFee ?? 0n) * (isIcrc2Token ? 2n : 1n)),
				tokenDecimals: token.decimals,
				tokenStandard: token.standard
			})
		: undefined;

	const setMax = () => {
		if (!isZeroBalance && nonNullish(maxAmount)) {
			amountSetToMax = true;
			amount = maxAmount;
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
	class:text-error-primary={isZeroBalance || nonNullish(errorType) || nonNullish(error)}
	class:text-brand-primary={!isZeroBalance && isNullish(errorType) && isNullish(error)}
>
	{$i18n.swap.text.max_balance}:
	{nonNullish(maxAmount) && nonNullish(token)
		? `${maxAmount} ${token.symbol}`
		: $i18n.swap.text.not_available}
</button>

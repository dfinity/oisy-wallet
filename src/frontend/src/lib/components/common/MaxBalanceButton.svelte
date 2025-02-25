<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let amount: OptionAmount;
	export let amountSetToMax = false;
	export let error = false;
	export let balance: OptionBalance;
	export let token: Token | undefined = undefined;
	export let fee: BigNumber | undefined = undefined;

	let isZeroBalance: boolean;
	$: isZeroBalance = isNullish(balance) || balance.isZero();

	let maxAmount: number | undefined;
	$: maxAmount = nonNullish(token)
		? getMaxTransactionAmount({
				balance: balance ?? undefined,
				fee,
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
	 * Reevaluate max amount if user has used the "Max" button and fee is changing.
	 */
	const debounceSetMax = () => {
		if (!amountSetToMax) {
			return;
		}
		debounce(() => setMax(), 500)();
	};

	$: fee, debounceSetMax();
</script>

<button
	class="font-semibold text-brand-primary transition-all"
	on:click|preventDefault={setMax}
	class:text-error-primary={isZeroBalance || error}
	class:text-brand-primary={!isZeroBalance && !error}
>
	{$i18n.core.text.max}:
	{nonNullish(maxAmount) && nonNullish(token)
		? `${maxAmount} ${token.symbol}`
		: $i18n.core.text.not_available}
</button>

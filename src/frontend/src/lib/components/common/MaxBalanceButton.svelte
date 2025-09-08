<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { ZERO } from '$lib/constants/app.constants';
	import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { getMaxTransactionAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	export let amount: OptionAmount;
	export let amountSetToMax = false;
	export let error = false;
	export let balance: OptionBalance;
	export let token: Token | undefined = undefined;
	export let fee: bigint | undefined = undefined;

	let isZeroBalance: boolean;
	$: isZeroBalance = isNullish(balance) || balance === ZERO;

	let maxAmount: string | undefined;
	$: maxAmount = nonNullish(token)
		? getMaxTransactionAmount({
				balance,
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

	$: (fee, debounceSetMax());
</script>

<button
	class="font-semibold text-brand-primary-alt transition-all"
	class:text-brand-primary-alt={!isZeroBalance && !error}
	class:text-error-primary={isZeroBalance || error}
	data-tid={MAX_BUTTON}
	on:click|preventDefault={setMax}
>
	{$i18n.core.text.max}:
	{nonNullish(maxAmount) && nonNullish(token)
		? `${maxAmount} ${getTokenDisplaySymbol(token)}`
		: $i18n.core.text.not_available}
</button>

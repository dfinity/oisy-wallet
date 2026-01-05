<script lang="ts">
	import { preventDefault } from '@dfinity/gix-components';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { ZERO } from '$lib/constants/app.constants';
	import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { getMaxTransactionAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		error?: boolean;
		balance: OptionBalance;
		token?: Token;
		fee?: bigint;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		error = false,
		balance,
		token,
		fee
	}: Props = $props();

	let isZeroBalance = $derived(!$isIcMintingAccount && (isNullish(balance) || balance === ZERO));

	let maxAmount = $derived(
		nonNullish(token)
			? getMaxTransactionAmount({
					balance,
					fee,
					tokenDecimals: token.decimals,
					tokenStandard: token.standard
				})
			: undefined
	);

	const setMax = () => {
		if (!isZeroBalance && nonNullish(maxAmount)) {
			amountSetToMax = true;
			amount = maxAmount;
		}
	};

	/**
	 * Reevaluate max amount if the user has used the "Max" button and the fee is changing.
	 */
	const debounceSetMax = () => {
		if (!amountSetToMax) {
			return;
		}
		debounce(() => setMax(), 500)();
	};

	$effect(() => {
		[fee];

		debounceSetMax();
	});
</script>

<button
	class="font-semibold text-brand-primary-alt transition-all"
	class:text-brand-primary-alt={!isZeroBalance && !error}
	class:text-error-primary={isZeroBalance || error}
	data-tid={MAX_BUTTON}
	onclick={preventDefault(setMax)}
>
	{$i18n.core.text.max}:
	{nonNullish(maxAmount) && nonNullish(token)
		? `${maxAmount} ${getTokenDisplaySymbol(token)}`
		: $i18n.core.text.not_available}
</button>

<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { isIcMintingAccount } from '$icp/stores/ic-minting-account.store';
	import { ZERO } from '$lib/constants/app.constants';
	import { MAX_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { preventDefault } from '$lib/utils/event-modifiers.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { getMaxTransactionAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		error?: boolean;
		balance: OptionBalance;
		token?: Token;
		fee?: bigint;
		// Optional hard cap (base units). When set, "Max" never exceeds it even if the
		// affordable balance is higher (e.g. full debt for repay).
		maxAmount?: bigint;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		error = false,
		balance,
		token,
		fee,
		maxAmount
	}: Props = $props();

	let isZeroBalance = $derived(!$isIcMintingAccount && (isNullish(balance) || balance === ZERO));

	let maxBalanceAmount = $derived(
		nonNullish(token)
			? getMaxTransactionAmount({
					balance,
					fee,
					tokenDecimals: token.decimals,
					tokenStandard: token.standard
				})
			: undefined
	);

	// Clamp the affordable max to the optional base-units cap.
	let cappedMaxAmount = $derived.by(() => {
		if (isNullish(maxBalanceAmount) || isNullish(token) || isNullish(maxAmount)) {
			return maxBalanceAmount;
		}

		const affordable = parseToken({ value: maxBalanceAmount, unitName: token.decimals });
		const capped = affordable < maxAmount ? affordable : maxAmount;

		return formatToken({
			value: capped,
			unitName: token.decimals,
			displayDecimals: token.decimals
		});
	});

	const setMax = () => {
		if (!isZeroBalance && nonNullish(cappedMaxAmount)) {
			amountSetToMax = true;
			amount = cappedMaxAmount;
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
	{nonNullish(cappedMaxAmount) && nonNullish(token)
		? `${cappedMaxAmount} ${getTokenDisplaySymbol(token)}`
		: $i18n.core.text.not_available}
</button>

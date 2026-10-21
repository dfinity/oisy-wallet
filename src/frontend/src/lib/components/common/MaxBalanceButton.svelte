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
		// Called when the user presses "Max", before it is applied: re-applying it for a new fee
		// does not call it.
		onMax?: () => void;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		error = false,
		balance,
		token,
		fee,
		maxAmount,
		onMax
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

	// A balance the fee uses up computes to a max of 0: Max would set nothing worth having, so it
	// shows no hover.
	let hasPositiveMax = $derived(
		nonNullish(cappedMaxAmount) &&
			nonNullish(token) &&
			parseToken({ value: cappedMaxAmount, unitName: token.decimals }) > ZERO
	);

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
		debounce(() => {
			// Rechecked because the flag can be cleared during the delay: typing into the input
			// clears it, and this callback would otherwise overwrite what the user just typed —
			// and re-arm the flag, so the next fee change would do it again.
			if (!amountSetToMax) {
				return;
			}

			setMax();
		}, 500)();
	};

	$effect(() => {
		// `maxAmount` is tracked alongside the fee because it arrives asynchronously and can
		// shrink afterwards — a BTC cap lands once the UTXOs load and drops again when a
		// pending send reserves some. A "Max" chosen before either would otherwise stay at the
		// balance-based amount the cap exists to rule out.
		[fee, maxAmount];

		debounceSetMax();
	});
</script>

<!-- The amount field sits 9 px above, so the tap area grows at most 9 px up and down. -->
<button
	class="hit-area relative font-semibold text-brand-primary-alt transition-[color,scale] duration-150 ease-out [--hit-area-y:calc(100%+1.125rem)] press-icon"
	class:hover:text-brand-hover={!isZeroBalance && !error && hasPositiveMax}
	class:text-brand-primary-alt={!isZeroBalance && !error}
	class:text-error-primary={isZeroBalance || error}
	data-tid={MAX_BUTTON}
	onclick={preventDefault(() => {
		onMax?.();
		setMax();
	})}
>
	{$i18n.core.text.max}:
	{nonNullish(cappedMaxAmount) && nonNullish(token)
		? `${cappedMaxAmount} ${getTokenDisplaySymbol(token)}`
		: $i18n.core.text.not_available}
</button>

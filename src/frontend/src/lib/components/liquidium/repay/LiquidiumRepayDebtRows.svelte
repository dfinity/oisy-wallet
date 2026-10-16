<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { liquidiumDebtInterestUsd } from '$lib/services/liquidium-repay.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	// The debt breakdown shared by the repay Form and Review so they always agree:
	// Current debt (principal) + Interest accrued = total owed;
	// Debt after repay = total − pending repays − amount.
	interface Props {
		reserve: LiquidiumReserve;
		amount: OptionAmount;
		// Net amount of this pool's repays still settling.
		pendingRepay?: bigint;
	}

	let { reserve, amount, pendingRepay = ZERO }: Props = $props();

	const formatUsd = (value: number) =>
		formatCurrency({
			value,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});

	let debtInterest = $derived(reserve.debtInterest ?? ZERO);
	let totalDebt = $derived(reserve.borrowed + debtInterest);

	let parsedRepay = $derived(
		!invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: reserve.borrowedDecimals })
			: ZERO
	);

	let totalRepay = $derived(pendingRepay + parsedRepay);

	let remainingBorrowed = $derived(totalDebt > totalRepay ? totalDebt - totalRepay : ZERO);

	// USD on the reserve's price basis (principal, interest and repays share the asset price).
	const toReserveUsd = (value: bigint): number =>
		reserve.borrowed > ZERO ? (Number(value) / Number(reserve.borrowed)) * reserve.borrowedUsd : 0;

	let interestUsd = $derived(liquidiumDebtInterestUsd(reserve));
	let pendingRepayUsd = $derived(toReserveUsd(pendingRepay));
	let remainingDebtUsd = $derived(
		Math.max(0, reserve.borrowedUsd + interestUsd - toReserveUsd(totalRepay))
	);

	let currentDebt = $derived(
		`${formatToken({ value: reserve.borrowed, unitName: reserve.borrowedDecimals })} ${reserve.asset}`
	);
	let pendingRepays = $derived(
		`${formatToken({ value: pendingRepay, unitName: reserve.borrowedDecimals })} ${reserve.asset}`
	);
	let interestAccrued = $derived(
		`${formatToken({ value: debtInterest, unitName: reserve.borrowedDecimals })} ${reserve.asset}`
	);
	let debtAfterRepay = $derived(
		`${formatToken({ value: remainingBorrowed, unitName: reserve.borrowedDecimals })} ${reserve.asset}`
	);
</script>

<ModalValue>
	{#snippet label()}{$i18n.liquidium.text.current_debt}{/snippet}
	{#snippet mainValue()}{currentDebt}{/snippet}
	{#snippet secondaryValue()}<span class="text-tertiary">{formatUsd(reserve.borrowedUsd)}</span
		>{/snippet}
</ModalValue>

{#if pendingRepay > ZERO}
	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.pending_repays}{/snippet}
		{#snippet mainValue()}{pendingRepays}{/snippet}
		{#snippet secondaryValue()}<span class="text-tertiary">{formatUsd(pendingRepayUsd)}</span
			>{/snippet}
	</ModalValue>
{/if}

<ModalValue>
	{#snippet label()}{$i18n.liquidium.text.interest_accrued}{/snippet}
	{#snippet mainValue()}{interestAccrued}{/snippet}
	{#snippet secondaryValue()}<span class="text-tertiary">{formatUsd(interestUsd)}</span>{/snippet}
</ModalValue>

<ModalValue>
	{#snippet label()}{$i18n.liquidium.text.debt_after_repay}{/snippet}
	{#snippet mainValue()}{debtAfterRepay}{/snippet}
	{#snippet secondaryValue()}<span class="text-tertiary">{formatUsd(remainingDebtUsd)}</span
		>{/snippet}
</ModalValue>

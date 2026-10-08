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
	// Current debt (principal) + Interest accrued = total owed; Debt after repay = total − amount.
	interface Props {
		reserve: LiquidiumReserve;
		amount: OptionAmount;
	}

	let { reserve, amount }: Props = $props();

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

	let remainingBorrowed = $derived(totalDebt > parsedRepay ? totalDebt - parsedRepay : ZERO);

	let interestUsd = $derived(liquidiumDebtInterestUsd(reserve));
	// Repaid USD on the reserve's price basis (principal and interest share the asset price).
	let repayUsd = $derived(
		reserve.borrowed > ZERO
			? (Number(parsedRepay) / Number(reserve.borrowed)) * reserve.borrowedUsd
			: 0
	);
	let remainingDebtUsd = $derived(Math.max(0, reserve.borrowedUsd + interestUsd - repayUsd));

	let currentDebt = $derived(
		`${formatToken({ value: reserve.borrowed, unitName: reserve.borrowedDecimals })} ${reserve.asset}`
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

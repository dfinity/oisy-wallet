<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import LiquidiumRepayDebtRows from '$lib/components/liquidium/repay/LiquidiumRepayDebtRows.svelte';
	import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		liquidiumPendingCoversDebt,
		type LiquidiumRepayPreview
	} from '$lib/services/liquidium-repay.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	interface Props {
		reserve: LiquidiumReserve;
		amount: OptionAmount;
		preview: LiquidiumRepayPreview;
		// Outstanding debt net of pending repays (base units); `undefined` while it (re)loads.
		maxRepay?: bigint;
		// The debt request failed, so there is no cap.
		maxRepayUnavailable?: boolean;
		// Net amount of this pool's repays still settling.
		pendingRepay?: bigint;
		// Provider fee (base units of the repaid token).
		inflowFee?: bigint;
		// Per-rail fee row (EthFeeDisplay / BtcUtxosFeeDisplay).
		feeDisplay: Snippet;
		onBack: () => void;
		onConfirm: () => void;
	}

	let {
		reserve,
		amount,
		preview,
		maxRepay,
		maxRepayUnavailable = false,
		pendingRepay = ZERO,
		inflowFee,
		feeDisplay,
		onBack,
		onConfirm
	}: Props = $props();

	let parsedAmount = $derived(
		!invalidAmount(amount)
			? parseToken({ value: `${amount}`, unitName: reserve.borrowedDecimals })
			: undefined
	);

	// The cap can change under an open Review: a repay that settles clears and refetches it, a new
	// pending one lowers it. Confirm is gated on it here; the wizard re-checks before broadcasting.
	let capMissing = $derived(isNullish(maxRepay));
	let pendingCoversDebt = $derived(liquidiumPendingCoversDebt({ pendingRepay, maxRepay, reserve }));
	let exceedsCap = $derived(
		nonNullish(maxRepay) && nonNullish(parsedAmount) && parsedAmount > maxRepay
	);
</script>

<StakeReview
	actionButtonLabel={$i18n.liquidium.text.action_repay}
	{amount}
	disabled={capMissing || pendingCoversDebt || exceedsCap}
	{onBack}
	{onConfirm}
>
	{#snippet subtitle()}
		{$i18n.liquidium.text.repay_review_subtitle}
	{/snippet}

	{#snippet content()}
		<ModalValue>
			{#snippet label()}{$i18n.core.text.to}{/snippet}
			{#snippet mainValue()}{liquidium.name}{/snippet}
		</ModalValue>

		<LiquidiumRepayDebtRows {amount} {pendingRepay} {reserve} />

		<LiquidiumProviderFee {inflowFee} />

		{@render feeDisplay()}

		{#if maxRepayUnavailable}
			<MessageBox level="warning" styleClass="mt-3">
				{$i18n.liquidium.text.repay_debt_unavailable}
			</MessageBox>
		{:else if pendingCoversDebt}
			<MessageBox level="info" styleClass="mt-3">
				{$i18n.liquidium.text.repay_pending_covers_debt}
			</MessageBox>
		{:else if exceedsCap}
			<MessageBox level="error" styleClass="mt-3">
				{$i18n.liquidium.text.repay_exceeds_debt}
			</MessageBox>
		{/if}

		<LiquidiumHealthFactor percent={preview.projectedHealthPercent} />
	{/snippet}
</StakeReview>

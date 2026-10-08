<script lang="ts">
	import type { Snippet } from 'svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import LiquidiumRepayDebtRows from '$lib/components/liquidium/repay/LiquidiumRepayDebtRows.svelte';
	import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import type { LiquidiumRepayPreview } from '$lib/services/liquidium-repay.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	interface Props {
		reserve: LiquidiumReserve;
		amount: OptionAmount;
		preview: LiquidiumRepayPreview;
		// Provider fee (base units of the repaid token).
		inflowFee?: bigint;
		// Per-rail fee row (EthFeeDisplay / BtcUtxosFeeDisplay).
		feeDisplay: Snippet;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { reserve, amount, preview, inflowFee, feeDisplay, onBack, onConfirm }: Props = $props();
</script>

<StakeReview actionButtonLabel={$i18n.liquidium.text.action_repay} {amount} {onBack} {onConfirm}>
	{#snippet subtitle()}
		{$i18n.liquidium.text.repay_review_subtitle}
	{/snippet}

	{#snippet content()}
		<ModalValue>
			{#snippet label()}{$i18n.core.text.to}{/snippet}
			{#snippet mainValue()}{liquidium.name}{/snippet}
		</ModalValue>

		<LiquidiumRepayDebtRows {amount} {reserve} />

		<LiquidiumProviderFee {inflowFee} />

		{@render feeDisplay()}

		<LiquidiumHealthFactor percent={preview.projectedHealthPercent} />
	{/snippet}
</StakeReview>

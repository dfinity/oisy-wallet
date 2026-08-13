<script lang="ts">
	import type { Snippet } from 'svelte';
	import LiquidiumProviderFee from '$lib/components/liquidium/supply/LiquidiumProviderFee.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import type { LiquidiumMarket } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	interface Props {
		market: LiquidiumMarket;
		amount: OptionAmount;
		// Provider fee (base units of the supplied token).
		inflowFee?: bigint;
		// Per-rail fee row (EthFeeDisplay / BtcUtxosFeeDisplay).
		feeDisplay: Snippet;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { market, amount, inflowFee, feeDisplay, onBack, onConfirm }: Props = $props();
</script>

<StakeReview actionButtonLabel={$i18n.liquidium.text.action_supply} {amount} {onBack} {onConfirm}>
	{#snippet subtitle()}
		{$i18n.liquidium.text.supply_review_subtitle}
	{/snippet}

	{#snippet content()}
		<ModalValue>
			{#snippet label()}{$i18n.core.text.to}{/snippet}
			{#snippet mainValue()}{liquidium.name}{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}{$i18n.liquidium.text.supply_apy}{/snippet}
			{#snippet mainValue()}
				<span class="text-success-primary">{market.supplyApy.toFixed(2)}%</span>
			{/snippet}
		</ModalValue>

		<LiquidiumProviderFee {inflowFee} />

		{@render feeDisplay()}
	{/snippet}
</StakeReview>

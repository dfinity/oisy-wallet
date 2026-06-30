<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { lendBorrowProvidersConfig } from '$lib/config/lend-borrow.config';
	import { LIQUIDIUM_ASSET_TOKENS } from '$lib/constants/liquidium.constants';
	import type { LiquidiumWithdrawPreview } from '$lib/services/liquidium-withdraw.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { LendBorrowProvider } from '$lib/types/lend-borrow';
	import type { LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		reserve: LiquidiumReserve;
		withdrawPrice: number;
		preview: LiquidiumWithdrawPreview;
		amount: OptionAmount;
		onBack: () => void;
		onConfirm: () => void;
	}

	let { reserve, withdrawPrice, preview, amount, onBack, onConfirm }: Props = $props();

	const liquidium = lendBorrowProvidersConfig[LendBorrowProvider.LIQUIDIUM];

	let withdrawToken = $derived(LIQUIDIUM_ASSET_TOKENS[reserve.asset]);
	let healthLevel = $derived(preview.healthLevel);
</script>

<ContentWithToolbar>
	{#if nonNullish(withdrawToken)}
		<SendTokenReview exchangeRate={withdrawPrice} sendAmount={amount} token={withdrawToken}>
			{#snippet subtitle()}{$i18n.liquidium.text.withdraw_review_subtitle}{/snippet}
		</SendTokenReview>
	{/if}

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.projected_health_factor}{/snippet}
		{#snippet mainValue()}
			<span
				class:text-error-primary={healthLevel === 'critical'}
				class:text-success-primary={healthLevel === 'healthy'}
				class:text-warning-primary={healthLevel === 'at-risk'}
			>
				{Math.round(preview.projectedHealthPercent)}%
			</span>
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.funds_delivered_to}{/snippet}
		{#snippet mainValue()}{replaceOisyPlaceholders(
				$i18n.liquidium.text.your_oisy_address
			)}{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.provider}{/snippet}
		{#snippet mainValue()}{liquidium.name}{/snippet}
	</ModalValue>

	{#if healthLevel === 'critical'}
		<MessageBox level="error" styleClass="mt-4">
			{$i18n.liquidium.text.withdraw_high_risk_warning}
		</MessageBox>
	{:else if healthLevel === 'at-risk'}
		<MessageBox level="warning" styleClass="mt-4">
			{$i18n.liquidium.text.withdraw_at_risk_warning}
		</MessageBox>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />

			<Button onclick={onConfirm}>
				{$i18n.liquidium.text.action_withdraw}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

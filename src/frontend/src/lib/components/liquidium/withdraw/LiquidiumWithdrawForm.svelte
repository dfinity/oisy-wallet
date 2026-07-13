<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import type { LiquidiumWithdrawPreview } from '$lib/services/liquidium-withdraw.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		reserve: LiquidiumReserve;
		withdrawToken: Token | undefined;
		withdrawPrice: number;
		portfolio: LiquidiumPortfolio;
		preview: LiquidiumWithdrawPreview;
		amount: OptionAmount;
		confirmChecked: boolean;
		// Opens the token-selection step; when set, the token logo becomes a selector.
		onSelectToken?: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		reserve,
		withdrawToken,
		withdrawPrice,
		portfolio,
		preview,
		amount = $bindable(),
		confirmChecked = $bindable(),
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');
	let amountSetToMax = $state(false);

	$effect(() => {
		amount;
		confirmChecked = false;
	});

	let hasDebt = $derived(portfolio.totalBorrowedUsd > 0);

	let withdrawCapFromUsd = $derived(
		nonNullish(withdrawToken) && withdrawPrice > 0 && preview.maxWithdrawableUsd > 0
			? parseToken({
					value: (preview.maxWithdrawableUsd / withdrawPrice).toFixed(withdrawToken.decimals),
					unitName: withdrawToken.decimals
				})
			: ZERO
	);

	let maxWithdrawBaseUnits = $derived(
		!hasDebt
			? reserve.deposited
			: withdrawCapFromUsd < reserve.deposited
				? withdrawCapFromUsd
				: reserve.deposited
	);

	let reservedByDebtBaseUnits = $derived(reserve.deposited - maxWithdrawBaseUnits);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount) && nonNullish(withdrawToken)
			? parseToken({ value: `${amount}`, unitName: withdrawToken.decimals })
			: undefined
	);

	let hasAmount = $derived(nonNullish(parsedAmount) && parsedAmount > ZERO);

	let exceedsCap = $derived(
		hasAmount && nonNullish(parsedAmount) && parsedAmount > maxWithdrawBaseUnits
	);

	// With debt the cap needs a price to size it; without debt it doesn't.
	let pricesUnavailable = $derived(hasDebt && withdrawPrice <= 0);

	// Prices unavailable → the cap can't be computed (it collapses to 0); the dedicated
	// MessageBox explains why, so skip the misleading "exceeds free collateral" inline.
	const validateWithdrawAmount = (userAmount: bigint): Error | undefined => {
		if (pricesUnavailable || userAmount <= maxWithdrawBaseUnits) {
			return undefined;
		}

		return new Error(
			hasDebt
				? $i18n.liquidium.text.withdraw_exceeds_free_collateral
				: $i18n.liquidium.text.withdraw_exceeds_supplied
		);
	};

	let needsConfirm = $derived(hasAmount && !exceedsCap && preview.healthLevel !== 'healthy');

	let canReview = $derived(
		hasAmount && !exceedsCap && !pricesUnavailable && (!needsConfirm || confirmChecked)
	);

	let suppliedFormatted = $derived(
		nonNullish(withdrawToken)
			? `${formatToken({ value: reserve.deposited, unitName: reserve.depositedDecimals })} ${reserve.asset}`
			: ''
	);

	let reservedFormatted = $derived(
		nonNullish(withdrawToken)
			? `${formatToken({ value: reservedByDebtBaseUnits, unitName: reserve.depositedDecimals })} ${reserve.asset}`
			: ''
	);
</script>

<ContentWithToolbar>
	<div class="mb-6">
		<TokenInput
			autofocus={isDesktop()}
			displayUnit={inputUnit}
			exchangeRate={withdrawPrice}
			isSelectable={nonNullish(onSelectToken)}
			onClick={onSelectToken}
			onCustomErrorValidate={validateWithdrawAmount}
			showTokenNetwork
			token={withdrawToken}
			bind:amount
		>
			{#snippet title()}{$i18n.core.text.amount}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={withdrawPrice}
						token={withdrawToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/snippet}

			{#snippet balance()}
				<MaxBalanceButton
					balance={maxWithdrawBaseUnits}
					token={withdrawToken}
					bind:amount
					bind:amountSetToMax
				/>
			{/snippet}
		</TokenInput>
	</div>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.supplied_label}{/snippet}
		{#snippet mainValue()}{suppliedFormatted}{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.reserved_by_debt}{/snippet}
		{#snippet mainValue()}{reservedFormatted}{/snippet}
	</ModalValue>

	<LiquidiumHealthFactor percent={preview.projectedHealthPercent} />

	{#if pricesUnavailable}
		<MessageBox level="warning" styleClass="mt-3">
			{$i18n.liquidium.text.withdraw_prices_unavailable}
		</MessageBox>
	{/if}

	{#if needsConfirm}
		<MessageBox level={preview.healthLevel === 'critical' ? 'error' : 'warning'} styleClass="mt-3">
			<div class="flex flex-col gap-3">
				<span>
					{preview.healthLevel === 'critical'
						? $i18n.liquidium.text.withdraw_high_risk_warning
						: $i18n.liquidium.text.withdraw_at_risk_warning}
				</span>

				<label class="flex cursor-pointer items-start gap-3">
					<Checkbox
						checked={confirmChecked}
						inputId="liquidium-withdraw-confirm"
						onChange={() => (confirmChecked = !confirmChecked)}
					/>
					<span class="text-sm">{$i18n.liquidium.text.withdraw_risk_confirm}</span>
				</label>
			</div>
		</MessageBox>
	{/if}

	<p class="mt-4 text-sm text-tertiary">{$i18n.liquidium.text.withdraw_risk_info}</p>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />

			<Button disabled={!canReview} onclick={onNext}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getMinimumBorrowAmount } from '@liquidium/client';
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
	import { LIQUIDIUM_BORROWING_POWER_TOLERANCE } from '$lib/constants/liquidium.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import type { LiquidiumBorrowPreview } from '$lib/services/liquidium-borrow.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumMarket, LiquidiumPortfolio } from '$lib/types/liquidium';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { formatCurrency, formatStakeApyNumber, formatToken } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		market: LiquidiumMarket;
		borrowToken: Token | undefined;
		borrowPrice: number;
		portfolio: LiquidiumPortfolio;
		preview: LiquidiumBorrowPreview;
		amount: OptionAmount;
		confirmChecked: boolean;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		market,
		borrowToken,
		borrowPrice,
		portfolio,
		preview,
		amount = $bindable(),
		confirmChecked = $bindable(),
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

	// Max borrowable in base units = borrowing power ÷ price (floored to token decimals).
	let maxBorrowBaseUnits = $derived(
		nonNullish(borrowToken) && borrowPrice > 0 && portfolio.availableBorrowsUsd > 0
			? parseToken({
					value: (portfolio.availableBorrowsUsd / borrowPrice).toFixed(borrowToken.decimals),
					unitName: borrowToken.decimals
				})
			: ZERO
	);

	let parsedAmount = $derived(
		nonNullish(amount) && !invalidAmount(amount) && nonNullish(borrowToken)
			? parseToken({ value: `${amount}`, unitName: borrowToken.decimals })
			: undefined
	);

	let hasAmount = $derived(nonNullish(parsedAmount) && parsedAmount > ZERO);

	let belowMinimum = $derived(
		hasAmount && nonNullish(parsedAmount) && parsedAmount < getMinimumBorrowAmount(market.asset)
	);

	const formatUsd = (value: number) =>
		formatCurrency({
			value,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		});

	let minBorrowFormatted = $derived(
		nonNullish(borrowToken)
			? `${formatToken({
					value: getMinimumBorrowAmount(market.asset),
					unitName: borrowToken.decimals
				})} ${market.asset}`
			: ''
	);

	// Shown inside the input. Shares the service cap's tolerance so "Max" doesn't flag itself.
	const validateBorrowAmount = (userAmount: bigint): Error | undefined => {
		if (userAmount < getMinimumBorrowAmount(market.asset)) {
			return new Error($i18n.liquidium.text.borrow_below_minimum);
		}

		const usd = (Number(userAmount) / 10 ** (borrowToken?.decimals ?? 0)) * borrowPrice;

		if (usd > portfolio.availableBorrowsUsd * (1 + LIQUIDIUM_BORROWING_POWER_TOLERANCE)) {
			return new Error($i18n.liquidium.text.borrow_exceeds_power);
		}

		return undefined;
	};

	// Any non-healthy projection requires explicit confirmation.
	let needsConfirm = $derived(
		hasAmount && !belowMinimum && preview.valid && preview.healthLevel !== 'healthy'
	);

	let canReview = $derived(
		hasAmount && !belowMinimum && preview.valid && (!needsConfirm || confirmChecked)
	);
</script>

<ContentWithToolbar>
	<div class="mb-4 flex flex-col rounded-xl bg-secondary p-3">
		<ModalValue>
			{#snippet label()}{$i18n.liquidium.text.collateral}{/snippet}
			{#snippet mainValue()}{formatUsd(portfolio.totalSuppliedUsd)}{/snippet}
		</ModalValue>

		<ModalValue>
			{#snippet label()}{$i18n.liquidium.text.borrowing_power}{/snippet}
			{#snippet mainValue()}{formatUsd(portfolio.availableBorrowsUsd)}{/snippet}
		</ModalValue>
	</div>

	<div class="mb-6">
		<!-- Token fixed by the market for now; a selectable step comes later. -->
		<TokenInput
			displayUnit={inputUnit}
			exchangeRate={borrowPrice}
			isSelectable={false}
			onCustomErrorValidate={validateBorrowAmount}
			showTokenNetwork
			token={borrowToken}
			bind:amount
		>
			{#snippet title()}{$i18n.core.text.amount}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={borrowPrice}
						token={borrowToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/snippet}

			{#snippet balance()}
				<MaxBalanceButton
					balance={maxBorrowBaseUnits}
					token={borrowToken}
					bind:amount
					bind:amountSetToMax
				/>
			{/snippet}
		</TokenInput>
	</div>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.minimum_borrow}{/snippet}
		{#snippet mainValue()}{minBorrowFormatted}{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.borrow_apy}{/snippet}
		{#snippet mainValue()}
			<span class="text-warning-primary">{formatStakeApyNumber(market.borrowApy)}%</span>
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}{$i18n.liquidium.text.resulting_ltv}{/snippet}
		{#snippet mainValue()}{preview.resultingLtvPercent.toFixed(1)}%{/snippet}
	</ModalValue>

	<LiquidiumHealthFactor percent={preview.projectedHealthPercent} />

	<!-- Amount errors show inside the input; only the risk confirmation lives here. -->
	{#if needsConfirm}
		<MessageBox level={preview.healthLevel === 'critical' ? 'error' : 'warning'} styleClass="mt-3">
			<div class="flex flex-col gap-3">
				<span>
					{preview.healthLevel === 'critical'
						? $i18n.liquidium.text.borrow_high_risk_warning
						: $i18n.liquidium.text.borrow_at_risk_warning}
				</span>

				<label class="flex cursor-pointer items-start gap-3">
					<Checkbox
						checked={confirmChecked}
						inputId="liquidium-borrow-confirm"
						onChange={() => (confirmChecked = !confirmChecked)}
					/>
					<span class="text-sm">{$i18n.liquidium.text.borrow_risk_confirm}</span>
				</label>
			</div>
		</MessageBox>
	{/if}

	<p class="mt-4 text-sm text-tertiary">{$i18n.liquidium.text.borrow_risk_info}</p>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />

			<Button disabled={!canReview} onclick={onNext}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

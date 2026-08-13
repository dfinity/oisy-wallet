<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
	import { TRADING_WITHDRAW_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { isDesktop } from '$lib/utils/device.utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		free: bigint;
		reserved: bigint;
		transferFee: bigint;
		onSelectToken: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		free,
		reserved,
		transferFee,
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');
	let errorType = $state<TokenActionErrorType>();

	// Withdraw enters the GROSS amount debited from the free balance; the user
	// receives gross minus the ledger transfer fee. Shown live so the net is
	// never a surprise (the inverse of the usual fee-on-top convention).
	//
	// Parse through decimal.js-backed tryParseToken rather than gating on JS Number:
	// amounts beyond the Number range coerce to Infinity, which would slip past a
	// finiteness guard and skip the free-balance check. ZERO for no/empty input;
	// `undefined` when the value can't be represented (overflow) — treated as invalid.
	let grossBaseUnits = $derived<bigint | undefined>(
		nonNullish(amount) && !invalidAmount(amount) && Number(amount) > 0
			? tryParseToken({ value: `${amount}`, unitName: $sendToken.decimals })
			: ZERO
	);

	let receiveBaseUnits = $derived(
		nonNullish(grossBaseUnits) && grossBaseUnits > transferFee ? grossBaseUnits - transferFee : ZERO
	);

	// The withdrawable balance is the free (non-reserved) portion; anything above
	// it is locked by open orders and would make the service call fail. An
	// unparseable amount (`undefined`) is treated as exceeding the free balance.
	let exceedsFree = $derived(nonNullish(grossBaseUnits) ? grossBaseUnits > free : true);

	// Drives the red input highlight; the disable + inline message read the same
	// synchronous derived so there is no debounce gap on the Review button.
	const onCustomValidate = (): TokenActionErrorType =>
		exceedsFree ? 'insufficient-funds' : undefined;

	// Block the gross-equals-or-below-fee case: the net transfer would be <= 0,
	// which the ledger rejects, so the withdraw is guaranteed to fail. `exceedsFree`
	// already covers the unparseable (`undefined`) case.
	let invalid = $derived(
		invalidAmount(amount) ||
			Number(amount) === 0 ||
			(nonNullish(grossBaseUnits) && grossBaseUnits <= transferFee) ||
			exceedsFree
	);
</script>

<ContentWithToolbar>
	<div class="mb-4">
		<TokenInput
			autofocus={isDesktop()}
			displayUnit={inputUnit}
			exchangeRate={$sendTokenExchangeRate}
			isSelectable
			onClick={onSelectToken}
			{onCustomValidate}
			showTokenNetwork
			token={$sendToken}
			bind:amount
			bind:amountSetToMax
			bind:errorType
		>
			{#snippet title()}{$i18n.trading.withdraw.amount_label}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/snippet}

			{#snippet balance()}
				<MaxBalanceButton
					balance={free}
					fee={ZERO}
					token={$sendToken}
					bind:amountSetToMax
					bind:amount
				/>
			{/snippet}
		</TokenInput>

		{#if exceedsFree}
			<p class="mt-1 text-xs text-error-primary">
				{$i18n.trading.withdraw.error_insufficient_balance}
			</p>
		{/if}

		{#if reserved > ZERO}
			<p class="mt-2 text-xs text-tertiary">
				{replacePlaceholders($i18n.trading.withdraw.reserved_note, {
					$amount: $isPrivacyMode
						? `••• ${$sendToken.symbol}`
						: `${formatToken({ value: reserved, unitName: $sendToken.decimals })} ${$sendToken.symbol}`
				})}
			</p>
		{/if}
	</div>

	<ModalValue>
		{#snippet label()}{$i18n.trading.withdraw.from}{/snippet}
		{#snippet mainValue()}
			<span class="inline-flex items-center gap-2">
				<span class="flex" aria-hidden="true">
					<OisyTradeMark size="22" />
				</span>
				{OISY_TRADE_PROVIDER_NAME}
			</span>
		{/snippet}
	</ModalValue>

	<FeeDisplay
		decimals={$sendToken.decimals}
		displayExchangeRate={false}
		feeAmount={transferFee}
		symbol={$sendToken.symbol}
	>
		{#snippet label()}{$i18n.trading.withdraw.transfer_fee}{/snippet}
	</FeeDisplay>

	<FeeDisplay
		decimals={$sendToken.decimals}
		displayExchangeRate={!$isPrivacyMode}
		exchangeRate={$sendTokenExchangeRate}
		feeAmount={receiveBaseUnits}
		symbol={$sendToken.symbol}
	>
		{#snippet label()}{$i18n.trading.withdraw.you_receive}{/snippet}
	</FeeDisplay>

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonCancel onclick={onClose} />

			<Button disabled={invalid} onclick={onNext} testId={TRADING_WITHDRAW_FORM_REVIEW_BUTTON}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

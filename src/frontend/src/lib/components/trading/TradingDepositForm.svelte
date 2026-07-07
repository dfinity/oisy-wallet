<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { IcToken } from '$icp/types/ic-token';
	import { getTokenFee } from '$icp/utils/token.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TradingDepositInfoBox from '$lib/components/trading/TradingDepositInfoBox.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		TRADING_DEPOSIT_CONSENT_CHECKBOX,
		TRADING_DEPOSIT_FORM_REVIEW_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		token?: IcToken;
		amount: OptionAmount;
		amountSetToMax?: boolean;
		consent: boolean;
		onSelectToken: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		token,
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		consent = $bindable(),
		onSelectToken,
		onClose,
		onNext
	}: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');
	let errorType = $state<TokenActionErrorType>();

	// One ledger fee per transaction; the deposit charges two (icrc2_approve +
	// icrc2_transfer_from), both on top of the deposited amount.
	let ledgerFee = $derived(nonNullish(token) ? getTokenFee(token) : undefined);
	let totalFee = $derived(nonNullish(ledgerFee) ? ledgerFee * 2n : undefined);

	let exchangeRate = $derived(nonNullish(token) ? $exchanges?.[token.id]?.usd : undefined);

	let walletBalance = $derived(
		nonNullish(token) ? ($balancesStore?.[token.id]?.data ?? ZERO) : undefined
	);

	let depositBaseUnits = $derived(
		nonNullish(token) &&
			!invalidAmount(amount) &&
			Number.isFinite(Number(amount)) &&
			Number(amount) > 0
			? parseToken({ value: `${amount}`, unitName: token.decimals })
			: ZERO
	);

	// The wallet must cover the deposit plus both ledger fees (approve + transfer_from).
	let exceedsBalance = $derived(
		nonNullish(walletBalance) && nonNullish(totalFee) && depositBaseUnits + totalFee > walletBalance
	);

	// Drives the red input highlight; the disable + inline message read the same
	// synchronous derived so there is no debounce gap on the Review button.
	const onCustomValidate = (): TokenActionErrorType =>
		exceedsBalance ? 'insufficient-funds' : undefined;

	let invalid = $derived(
		!consent ||
			invalidAmount(amount) ||
			Number(amount) === 0 ||
			exceedsBalance ||
			nonNullish(errorType)
	);
</script>

<ContentWithToolbar>
	<div class="mb-4">
		<TokenInput
			displayUnit={inputUnit}
			{exchangeRate}
			isSelectable
			onClick={onSelectToken}
			{onCustomValidate}
			showTokenNetwork
			{token}
			bind:amount
			bind:amountSetToMax
			bind:errorType
		>
			{#snippet title()}{$i18n.trading.deposit.you_deposit}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					{#if nonNullish(token)}
						<TokenInputAmountExchange
							{amount}
							{exchangeRate}
							{token}
							bind:displayUnit={exchangeValueUnit}
						/>
					{/if}
				</div>
			{/snippet}

			{#snippet balance()}
				{#if nonNullish(token)}
					<MaxBalanceButton
						balance={walletBalance}
						error={nonNullish(errorType)}
						fee={totalFee}
						{token}
						bind:amountSetToMax
						bind:amount
					/>
				{/if}
			{/snippet}
		</TokenInput>

		{#if exceedsBalance}
			<p class="mt-1 text-xs text-error-primary">
				{$i18n.trading.deposit.error_insufficient_balance}
			</p>
		{/if}
	</div>

	<div class="mb-4">
		<ModalValue>
			{#snippet label()}{$i18n.trading.deposit.to}{/snippet}
			{#snippet mainValue()}{$i18n.trading.text.provider_name}{/snippet}
		</ModalValue>
	</div>

	<label
		class="mb-4 flex cursor-pointer items-start gap-3 rounded-lg bg-secondary p-3"
		for={TRADING_DEPOSIT_CONSENT_CHECKBOX}
	>
		<Checkbox
			checked={consent}
			inputId={TRADING_DEPOSIT_CONSENT_CHECKBOX}
			onChange={() => (consent = !consent)}
			testId={TRADING_DEPOSIT_CONSENT_CHECKBOX}
		/>
		<span class="text-sm text-tertiary">{$i18n.trading.deposit.consent}</span>
	</label>

	<TradingDepositInfoBox />

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />
			<Button disabled={invalid} onclick={onNext} testId={TRADING_DEPOSIT_FORM_REVIEW_BUTTON}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

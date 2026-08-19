<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		// Focus the amount input on mount. Callers gate this on `isDesktop()` so
		// mobile keyboards don't pop open over the form.
		autofocus?: boolean;
		disabled?: boolean;
		destination?: Address;
		totalFee?: bigint;
		// Fee charged in the amount's own token (e.g. a provider fee), always
		// reserved from the Max balance regardless of token standard — unlike
		// `totalFee`, which `getMaxTransactionAmount` only subtracts for native tokens.
		providerFee?: bigint;
		// Optional hard cap (base units) forwarded to "Max" — e.g. full debt for repay.
		maxAmount?: bigint;
		errorType?: TokenActionErrorType;
		error?: Error;
		// Makes the token logo a clickable selector; when set, `onClick` fires on click.
		// Defaults to a static (non-selectable) token display.
		isSelectable?: boolean;
		onClick?: () => void;
		onCustomValidate?: (userAmount: bigint) => TokenActionErrorType;
		onCustomErrorValidate?: (userAmount: bigint) => Error | undefined;
		onClose: () => void;
		onNext: () => void;
		content?: Snippet;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		autofocus = false,
		disabled,
		destination,
		totalFee,
		providerFee = ZERO,
		maxAmount,
		errorType = $bindable(),
		error = $bindable(),
		isSelectable = false,
		onClick,
		onCustomValidate,
		onCustomErrorValidate,
		onClose,
		onNext,
		content
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);
	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	// Reserve the provider fee (charged in the amount token) from the spendable
	// balance, so "Max" never selects more than amount + fee the wallet can cover.
	let maxBalance = $derived(
		nonNullish($sendBalance)
			? $sendBalance > providerFee
				? $sendBalance - providerFee
				: ZERO
			: $sendBalance
	);

	let invalid = $derived(
		invalidAmount(amount) ||
			Number(amount) === 0 ||
			nonNullish(errorType) ||
			nonNullish(error) ||
			disabled
	);
</script>

<ContentWithToolbar>
	<div class="mb-8">
		<TokenInput
			{autofocus}
			displayUnit={inputUnit}
			exchangeRate={$sendTokenExchangeRate}
			{isSelectable}
			{onClick}
			{onCustomErrorValidate}
			{onCustomValidate}
			showTokenNetwork
			token={$sendToken}
			bind:amount
			bind:errorType
			bind:error
			bind:amountSetToMax
		>
			{#snippet title()}{$i18n.core.text.amount}{/snippet}

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
					balance={maxBalance}
					error={nonNullish(errorType)}
					fee={totalFee}
					{maxAmount}
					token={$sendToken}
					bind:amountSetToMax
					bind:amount
				/>
			{/snippet}
		</TokenInput>
	</div>

	{#if nonNullish(destination)}
		<div class="mb-8">
			<SendReviewDestination {destination} />
		</div>
	{/if}

	{#if errorType === 'insufficient-funds-for-fee'}
		<InsufficientFundsForFee />
	{/if}

	{@render content?.()}

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonCancel onclick={onClose} />

			<Button disabled={invalid} onclick={onNext} testId={STAKE_FORM_REVIEW_BUTTON}>
				{$i18n.send.text.review}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

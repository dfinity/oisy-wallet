<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import CyclesMintDetails from '$icp/components/cycles-mint/CyclesMintDetails.svelte';
	import { CYCLES_MINT_MIN_ESTIMATE } from '$icp/constants/cmc.constants';
	import { estimateCyclesMintCredited } from '$icp/utils/cycles-mint.utils';
	import { getTokenFee } from '$icp/utils/token.utils';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import IconMoveDown from '$lib/components/icons/lucide/IconMoveDown.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import TokenInputBalance from '$lib/components/tokens/TokenInputBalance.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		CYCLES_MINT_FORM,
		CYCLES_MINT_FORM_REVIEW_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		sendAmount: OptionAmount;
		xdrPermyriadPerIcp?: bigint;
		rateUnavailable: boolean;
		onCancel: () => void;
		onNext: () => void;
	}

	let {
		sendAmount = $bindable(),
		xdrPermyriadPerIcp,
		rateUnavailable,
		onCancel,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, destinationTokenBalance, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { insufficientFunds, insufficientFundsForFee } =
		getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	let exchangeValueUnit = $state<DisplayUnit>('usd');
	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	let amount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? parseToken({ value: `${sendAmount}`, unitName: $sourceToken.decimals })
			: undefined
	);

	let estimate = $derived(
		nonNullish(amount) && nonNullish(xdrPermyriadPerIcp)
			? estimateCyclesMintCredited({ amount, xdrPermyriadPerIcp })
			: undefined
	);

	let estimateAmount = $derived(
		nonNullish(estimate)
			? formatToken({
					value: estimate,
					unitName: $destinationToken.decimals,
					displayDecimals: $destinationToken.decimals
				})
			: undefined
	);

	// Below twice the deposit fee, a drop in the rate before the mint runs could leave
	// nothing to credit, and the CMC would refund it minus fees larger than the amount.
	let tooSmall = $derived(
		nonNullish(amount) &&
			amount > ZERO &&
			nonNullish(xdrPermyriadPerIcp) &&
			amount * xdrPermyriadPerIcp < CYCLES_MINT_MIN_ESTIMATE
	);

	let invalid = $derived(
		isNullish(xdrPermyriadPerIcp) ||
			isNullish(amount) ||
			amount === ZERO ||
			$insufficientFunds ||
			$insufficientFundsForFee ||
			tooSmall
	);

	let errorMessage = $derived(
		rateUnavailable
			? replacePlaceholders($i18n.cycles_mint.error.rate_unavailable, {
					$token: $destinationToken.symbol
				})
			: $insufficientFunds
				? $i18n.send.assertion.insufficient_funds
				: $insufficientFundsForFee
					? $i18n.fee.assertion.insufficient_funds_for_fee
					: tooSmall
						? replacePlaceholders($i18n.cycles_mint.error.amount_too_small, {
								$token: $destinationToken.symbol
							})
						: undefined
	);
</script>

<ContentWithToolbar testId={CYCLES_MINT_FORM}>
	<p class="mb-4 text-sm text-tertiary">
		{replacePlaceholders($i18n.cycles_mint.text.description, {
			$sourceToken: $sourceToken.symbol,
			$destinationToken: $destinationToken.symbol
		})}
	</p>

	<div class="relative">
		<!-- The amount waits for the rate: without it there is nothing to estimate. A disabled
			 fieldset disables the input and its Max button alike. -->
		<fieldset class="mb-2 min-w-0" disabled={isNullish(xdrPermyriadPerIcp)}>
			<ConvertAmountSource
				{inputUnit}
				totalFee={getTokenFee($sourceToken)}
				bind:sendAmount
				bind:exchangeValueUnit
			/>
		</fieldset>

		<div
			class="absolute top-0 right-0 bottom-0 left-0 m-auto flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-secondary bg-surface shadow-sm"
		>
			<IconMoveDown />
		</div>

		<TokenInput
			amount={estimateAmount}
			disabled
			displayUnit={inputUnit}
			exchangeRate={$destinationTokenExchangeRate}
			isSelectable={false}
			token={$destinationToken}
		>
			{#snippet title()}{$i18n.cycles_mint.text.you_mint_estimate}{/snippet}

			{#snippet amountInfo()}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						amount={estimateAmount}
						exchangeRate={$destinationTokenExchangeRate}
						token={$destinationToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/snippet}

			{#snippet balance()}
				<TokenInputBalance balance={$destinationTokenBalance} token={$destinationToken} />
			{/snippet}
		</TokenInput>
	</div>

	<div class="mt-6">
		{#if nonNullish(errorMessage)}
			<div class="mb-4" in:fade>
				<MessageBox level="error">{errorMessage}</MessageBox>
			</div>
		{/if}

		<CyclesMintDetails {xdrPermyriadPerIcp} />

		<div class="mt-4">
			<MessageBox level="info">
				{replacePlaceholders($i18n.cycles_mint.text.one_way, {
					$sourceToken: $sourceToken.symbol,
					$destinationToken: $destinationToken.symbol
				})}
			</MessageBox>
		</div>
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onCancel} />

			<Button disabled={invalid} onclick={onNext} testId={CYCLES_MINT_FORM_REVIEW_BUTTON}>
				{$i18n.convert.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

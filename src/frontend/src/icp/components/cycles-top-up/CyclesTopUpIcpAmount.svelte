<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import CyclesTopUpIcpDetails from '$icp/components/cycles-top-up/CyclesTopUpIcpDetails.svelte';
	import { CYCLES_TOP_UP_REFUND_FEES } from '$icp/constants/cmc.constants';
	import { getTokenFee } from '$icp/utils/token.utils';
	import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		CYCLES_TOP_UP_AMOUNT,
		CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { fade } from '$lib/utils/transitions.utils';

	interface Props {
		sendAmount: OptionAmount;
		xdrPermyriadPerIcp?: bigint;
		rateUnavailable: boolean;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		sendAmount = $bindable(),
		xdrPermyriadPerIcp,
		rateUnavailable,
		onBack,
		onNext
	}: Props = $props();

	const { sourceToken, sourceTokenBalance } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { insufficientFunds, insufficientFundsForFee } =
		getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	let fee = $derived(getTokenFee($sourceToken) ?? ZERO);

	let amount = $derived(
		nonNullish(sendAmount) && !invalidAmount(sendAmount)
			? tryParseToken({ value: `${sendAmount}`, unitName: $sourceToken.decimals })
			: undefined
	);

	// A failed top-up is refunded minus the CMC's refund fees, so at or below them it would
	// return nothing. Unlike a mint's, the bound does not depend on the rate: no cycles
	// ledger fee comes off what the canister receives.
	let tooSmall = $derived(
		nonNullish(amount) && amount > ZERO && amount <= CYCLES_TOP_UP_REFUND_FEES
	);

	// As in the TCYCLES amount step: the balance flags come from a validation that runs
	// 300 ms after the amount changes.
	let unaffordable = $derived(
		nonNullish(amount) && nonNullish($sourceTokenBalance) && amount + fee > $sourceTokenBalance
	);

	let invalid = $derived(
		isNullish(xdrPermyriadPerIcp) ||
			isNullish(amount) ||
			amount === ZERO ||
			$insufficientFunds ||
			$insufficientFundsForFee ||
			unaffordable ||
			tooSmall
	);

	let errorMessage = $derived(
		rateUnavailable
			? $i18n.cycles_top_up.error.rate_unavailable
			: $insufficientFunds
				? $i18n.send.assertion.insufficient_funds
				: $insufficientFundsForFee
					? $i18n.fee.assertion.insufficient_funds_for_fee
					: tooSmall
						? replacePlaceholders($i18n.cycles_top_up.error.amount_too_small_icp, {
								$amount: formatToken({
									value: CYCLES_TOP_UP_REFUND_FEES,
									unitName: $sourceToken.decimals,
									displayDecimals: $sourceToken.decimals
								}),
								$token: $sourceToken.symbol
							})
						: undefined
	);
</script>

<ContentWithToolbar testId={CYCLES_TOP_UP_AMOUNT}>
	<!-- The amount waits for the rate, as Mint's does: without it there is nothing to
		 estimate. A disabled fieldset disables the input and its Max button alike. -->
	<fieldset class="min-w-0" disabled={isNullish(xdrPermyriadPerIcp)}>
		<ConvertAmountSource autofocus totalFee={fee} bind:sendAmount />
	</fieldset>

	<div class="mt-6">
		{#if nonNullish(errorMessage)}
			<div class="mb-4" in:fade>
				<MessageBox level="error">{errorMessage}</MessageBox>
			</div>
		{/if}

		<CyclesTopUpIcpDetails {amount} {xdrPermyriadPerIcp} />
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />

			<Button disabled={invalid} onclick={onNext} testId={CYCLES_TOP_UP_AMOUNT_NEXT_BUTTON}>
				{$i18n.convert.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

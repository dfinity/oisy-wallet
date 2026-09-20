<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { XrpAmountAssertionError } from '$xrp/types/xrp-send';

	interface Props {
		amount: OptionAmount;
		amountError?: XrpAmountAssertionError;
		onTokensList: () => void;
	}

	let { amount = $bindable(), amountError = $bindable(), onTokensList }: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	const { sendToken, sendBalance, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { feeStore: fee, reserveStore: reserve }: XrpFeeContext =
		getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	// An XRPL account must retain its reserve — the base plus the owner reserve for every
	// ledger object it owns. Neither that nor the fee is available to send, so both are
	// subtracted from the max and required by the balance check.
	//
	// While EITHER is unknown NOTHING is offered as sendable: the balance is treated as entirely
	// unavailable, which renders Max as 0 rather than an amount the ledger would reject. Falling
	// back to the base reserve would understate the requirement for an account owning objects,
	// and falling back to zero would be worse still. The fee is the same mistake one value over —
	// `XrpFeeContext` loads the two independently, so `account_info` can answer first, and a zero
	// fee would offer a max that is over by exactly the fee. That outlasts the race:
	// `TokenInputContent` revalidates on amount/token change alone, so an amount accepted while
	// the fee was unknown would stay accepted once it arrived.
	let unavailable = $derived(
		isNullish($reserve) || isNullish($fee) ? ($sendBalance ?? ZERO) : $fee + $reserve
	);

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (invalidAmount(Number(userAmount)) || userAmount === ZERO) {
			return new XrpAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		// Skipped while either requirement is unknown. `unavailable` is then the whole balance, a
		// placeholder that rejects every amount — and the rejection would outlive the load, because
		// `TokenInputContent` validates from an effect tracking `[amount, token]` through a debounce,
		// so the fee and reserve are read in a timer callback where nothing tracks them. The user
		// would be left with an error they can only clear by editing the amount again.
		//
		// Nothing is lost by waiting: the form blocks Next while either value is unknown, and
		// `sendXrp` re-reads both and refuses before signing.
		if (
			nonNullish($sendBalance) &&
			nonNullish($reserve) &&
			nonNullish($fee) &&
			userAmount + unavailable > $sendBalance
		) {
			return new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_reserve);
		}
	};
</script>

<div class="mb-4">
	<TokenInput
		autofocus={nonNullish($sendToken)}
		displayUnit={inputUnit}
		exchangeRate={$sendTokenExchangeRate}
		onClick={onTokensList}
		onCustomErrorValidate={customValidate}
		token={$sendToken}
		bind:amount
		bind:error={amountError}
	>
		{#snippet title()}{$i18n.core.text.amount}{/snippet}

		{#snippet amountInfo()}
			{#if nonNullish($sendToken)}
				<div class="text-tertiary">
					<TokenInputAmountExchange
						{amount}
						exchangeRate={$sendTokenExchangeRate}
						token={$sendToken}
						bind:displayUnit={exchangeValueUnit}
					/>
				</div>
			{/if}
		{/snippet}

		{#snippet balance()}
			{#if nonNullish($sendToken)}
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					fee={unavailable}
					token={$sendToken}
					bind:amount
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>

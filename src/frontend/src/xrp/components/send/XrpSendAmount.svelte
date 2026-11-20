<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { XRP_TRANSFER_RATE_NO_FEE } from '$xrp/constants/xrp.constants';
	import { enabledXrpTokens } from '$xrp/derived/tokens.derived';
	import { XRP_FEE_CONTEXT_KEY, type XrpFeeContext } from '$xrp/stores/xrp-fee.store';
	import { XrpAmountAssertionError } from '$xrp/types/xrp-send';
	import {
		fitsXrpTokenPrecision,
		getXrpTokenMaxAmount,
		isTokenXrpTrustLine
	} from '$xrp/utils/xrp-trust-line.utils';

	interface Props {
		amount: OptionAmount;
		amountError?: XrpAmountAssertionError;
		destination?: string;
		onTokensList: () => void;
	}

	let {
		amount = $bindable(),
		amountError = $bindable(),
		destination,
		onTokensList
	}: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	// One flag for the input and the button, as `EthSendAmount` does. Left unbound they each keep a
	// private copy: typing clears the input's, the button's stays set, and `MaxBalanceButton` then
	// re-maxes on the next fee change — overwriting what was just typed. Its own re-check exists to
	// stop precisely that and can only work if both read the same state. XRP is where it bites,
	// because `fee` below is the fee plus the reserve and the poller moves it every ten seconds.
	let amountSetToMax = $state(false);

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	const { sendToken, sendBalance, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const {
		feeStore: fee,
		reserveStore: reserve,
		transferRateStore
	}: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	// A trust-line token's amount is in the token; only the network fee comes out of XRP, and the
	// reserve does not limit it.
	let trustLineToken = $derived(
		nonNullish($sendToken) && isTokenXrpTrustLine($sendToken) ? $sendToken : undefined
	);

	// The issuer charges no transfer fee on a payment to itself.
	let transferRate = $derived(
		isNullish(trustLineToken)
			? undefined
			: destination === trustLineToken.issuer
				? XRP_TRANSFER_RATE_NO_FEE
				: $transferRateStore
	);

	let tokenMax = $derived(
		nonNullish(trustLineToken) && nonNullish($sendBalance) && nonNullish(transferRate)
			? getXrpTokenMaxAmount({ balance: $sendBalance, transferRate })
			: undefined
	);

	let xrpBalance = $derived.by(() => {
		const nativeToken = $enabledXrpTokens.find(
			({ network: { id } }) => id === trustLineToken?.network.id
		);

		return nonNullish(nativeToken) ? $balancesStore?.[nativeToken.id]?.data : undefined;
	});

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

	// All three figures the verdict below is measured against, which is the same list the form
	// gates on — they have to agree. A fee decrease can make a rejected amount sendable again, and
	// a balance arriving turns a skipped check into a real one; without either, the stale verdict
	// outlives the change and the form is wrong in one direction or the other until the amount is
	// edited, with nothing on screen saying why.
	//
	// A string rather than the values, so an unchanged set compares equal and nothing reruns.
	let revalidateKey = $derived(
		`${$fee}:${$reserve}:${$sendBalance}:${transferRate}:${tokenMax}:${xrpBalance}`
	);

	// Each figure is judged only once known, as for XRP below: the form blocks Next while the transfer
	// rate is unknown, and `sendXrp` reads every one of them again before signing.
	const validateTokenAmount = (userAmount: bigint): Error | undefined => {
		if (!fitsXrpTokenPrecision(userAmount)) {
			return new XrpAmountAssertionError($i18n.send.assertion.xrp_token_amount_too_precise);
		}

		if (nonNullish(tokenMax) && userAmount > tokenMax) {
			return new InsufficientFundsError(
				nonNullish(transferRate) && transferRate > XRP_TRANSFER_RATE_NO_FEE
					? $i18n.send.assertion.xrp_insufficient_funds_for_transfer_fee
					: $i18n.send.assertion.insufficient_funds
			);
		}

		if (nonNullish(xrpBalance) && nonNullish($fee) && xrpBalance < $fee) {
			return new InsufficientFundsError($i18n.send.assertion.xrp_insufficient_xrp_for_fee);
		}
	};

	const customValidate = (userAmount: bigint): Error | undefined => {
		if (invalidAmount(Number(userAmount)) || userAmount === ZERO) {
			return new XrpAmountAssertionError($i18n.send.assertion.amount_invalid);
		}

		if (nonNullish(trustLineToken)) {
			return validateTokenAmount(userAmount);
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
		{revalidateKey}
		showTokenNetwork
		token={$sendToken}
		bind:amount
		bind:amountSetToMax
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
				<!-- For a token nothing is offered while the transfer rate is unknown, as nothing is for XRP
				     while the fee or reserve is. -->
				<MaxBalanceButton
					balance={$sendBalance}
					error={nonNullish(amountError)}
					fee={nonNullish(trustLineToken) ? ZERO : unavailable}
					maxAmount={nonNullish(trustLineToken) ? (tokenMax ?? ZERO) : undefined}
					token={$sendToken}
					bind:amount
					bind:amountSetToMax
				/>
			{/if}
		{/snippet}
	</TokenInput>
</div>

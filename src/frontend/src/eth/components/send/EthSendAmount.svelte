<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
	import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { InsufficientFundsError, type OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken, tryParseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		amountSetToMax?: boolean;
		insufficientFunds: boolean;
		insufficientFundsForFee?: boolean;
		nativeEthereumToken: Token;
		onTokensList: () => void;
	}

	let {
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		insufficientFunds = $bindable(),
		insufficientFundsForFee = $bindable(false),
		nativeEthereumToken,
		onTokensList
	}: Props = $props();

	let exchangeValueUnit = $state<DisplayUnit>('usd');

	let inputUnit = $derived<DisplayUnit>(exchangeValueUnit === 'token' ? 'usd' : 'token');

	// Drives the field's own red decoration (border, message, "Max" turning red) via `TokenInput`,
	// which also populates this itself for a plain invalid-amount error regardless of token type -
	// see the effect below, which keeps it in step with the validation that gates "Next".
	// An ERC-20 amount exceeding its own token balance lands here too, same as a native shortfall -
	// it is this field's own problem to fix. A fee shortfall never does: whether the fee is settled
	// in a different token (ERC-20) or drawn from this very balance (native), a balance that cannot
	// cover the gas at all is fixed by neither raising nor lowering the amount - see `EthSendForm`'s
	// dedicated fee box.
	let insufficientFundsError = $state<InsufficientFundsError | undefined>();

	const {
		feeStore: storeFeeData,
		minGasFee,
		maxGasFee
	} = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendBalance, sendTokenId, sendToken, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	// The gas comes out of the amount only when the token being sent is the one that pays for it.
	// An ERC-20 send spends its own balance in full and settles the fee in ETH separately.
	let feeIsPaidFromAmount = $derived(
		isSupportedEthTokenId($sendTokenId) || isSupportedEvmNativeTokenId($sendTokenId)
	);

	interface AmountValidation {
		// Shown as this field's own red decoration. Set for a native shortfall and for an ERC-20
		// amount exceeding its own balance - never for the ERC-20 fee shortfall, paid in another token.
		fieldError?: InsufficientFundsError;
		// ERC-20 only: the typed amount exceeds the token's own balance.
		insufficientTokenBalance: boolean;
		// The native coin can't cover the fee - the ERC-20 fee, settled in it, or its own gas on a
		// native send. No amount fixes either, so both are reported off the field.
		insufficientFundsForFee: boolean;
		// True while sufficiency cannot be confirmed yet - the gas fee hasn't arrived. Gating
		// must treat this like a shortfall (block "Next"): an unresolved fee is not a confirmed
		// "no issue", and treating it as one let a fast "Next" through before the fee it depends
		// on had actually loaded. Neither decoration is shown for it - there is nothing wrong to
		// report yet, only nothing settled.
		pending: boolean;
	}

	const NO_ISSUE: AmountValidation = {
		insufficientTokenBalance: false,
		insufficientFundsForFee: false,
		pending: false
	};

	const FEE_PENDING: AmountValidation = {
		insufficientTokenBalance: false,
		insufficientFundsForFee: false,
		pending: true
	};

	// We should align the $sendBalance and userAmount to avoid issues caused by comparing formatted and unformatted BN
	let parsedSendBalance = $derived(
		nonNullish($sendBalance)
			? parseToken({
					value: formatToken({
						value: $sendBalance,
						unitName: $sendTokenDecimals,
						displayDecimals: $sendTokenDecimals
					}),
					unitName: $sendTokenDecimals
				})
			: ZERO
	);

	// The chain requires the balance to cover the amount plus `maxFeePerGas * gas` plus, on an
	// OP-stack chain, the L1 data fee, so the ceiling is what decides whether a native send is
	// affordable. `minGasFee` omits the base fee entirely and therefore bounds nothing the chain
	// enforces. Falling back to the tip rather than to zero: an unknown ceiling must not weaken the
	// check below what it was before the flag.
	let gasFee = $derived(
		SEND_TRANSACTION_PRIORITY_ENABLED ? ($maxGasFee ?? $minGasFee ?? ZERO) : ($minGasFee ?? ZERO)
	);

	// Native only: the balance does not cover the gas on its own, so "Max" is 0 and no amount would
	// go through. Reported by `EthSendForm`'s fee box - the same box the ERC-20 fee shortfall uses,
	// the native coin already being the fee token there - and derived independently of the amount,
	// because it holds just as much while the field is still empty.
	let insufficientNativeBalanceForFee = $derived(
		feeIsPaidFromAmount && nonNullish($storeFeeData) && parsedSendBalance < gasFee
	);

	const evaluateAmount = (userAmount: bigint): AmountValidation => {
		if (isNullish($storeFeeData)) {
			return FEE_PENDING;
		}

		if (feeIsPaidFromAmount) {
			const total = userAmount + gasFee;

			if (total <= parsedSendBalance) {
				return NO_ISSUE;
			}

			// Normally an amount problem, whether the amount alone exceeds the balance or it is
			// reserving gas that tips the total over: the gas is paid out of the very balance the
			// amount is drawn from, so lowering the amount is the user's only fix either way. The
			// gas wording is reserved for the ERC-20 case, where the fee is settled in a token this
			// field cannot influence - see `EthSendForm`'s dedicated fee box.
			//
			// Except when the gas shortfall is the whole story: the balance cannot cover the gas and
			// the amount itself still fits inside it. "Max" reads 0, so blaming the amount points at
			// a field no value would fix - the fee box reports the one thing the user can act on. It
			// stays alongside the amount error whenever the amount is genuinely oversized too.
			const gasShortfallOnly = insufficientNativeBalanceForFee && userAmount <= parsedSendBalance;

			return {
				fieldError: gasShortfallOnly
					? undefined
					: new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount),
				insufficientTokenBalance: false,
				insufficientFundsForFee: insufficientNativeBalanceForFee,
				pending: false
			};
		}

		// An ERC-20 send has two independent shortfalls: the balance of the token being sent - e.g.
		// 20 DAI - may not cover the amount, and the native coin may not cover the gas, settled in a
		// different token. Lowering the amount cannot fix the gas side, so neither check may
		// short-circuit the other: both are reported whenever both hold. The amount shortfall is the
		// field's own problem and gets the same red decoration as a native one; the fee shortfall
		// stays off the field, reported by `EthSendForm`'s dedicated fee box instead.
		const insufficientTokenBalance = userAmount > parsedSendBalance;

		const ethBalance = $balancesStore?.[nativeEthereumToken.id]?.data ?? ZERO;

		return {
			fieldError: insufficientTokenBalance
				? new InsufficientFundsError($i18n.send.assertion.insufficient_funds_for_amount)
				: undefined,
			insufficientTokenBalance,
			insufficientFundsForFee: nonNullish($maxGasFee) && ethBalance < $maxGasFee,
			pending: false
		};
	};

	// `TokenInput` parses and (in)validates the raw amount itself before calling this, but only on
	// its own debounced schedule - fine for the field's decoration, not for gating navigation. This
	// mirrors that same parsing so the check below never has to wait on it.
	let parsedAmount = $derived.by(() =>
		invalidAmount(amount) || isNullish($sendToken)
			? undefined
			: tryParseToken({ value: `${amount}`, unitName: $sendTokenDecimals })
	);

	// Always a concrete result, never a bare `undefined`: an empty/unparsed field is "pending"
	// exactly like a fee still in flight, so the two effects below read one consistent shape
	// instead of re-deriving "nothing to evaluate yet" from `parsedAmount` a second time - and a
	// value that was cleared and retyped is re-evaluated from this same single source every time.
	let validation = $derived.by((): AmountValidation =>
		nonNullish(parsedAmount) ? evaluateAmount(parsedAmount) : FEE_PENDING
	);

	// The native fee shortfall does not wait on an amount: an empty field is still a balance that
	// cannot cover its own gas, and the box has to say so before anything is typed. The ERC-20 one
	// comes from the amount validation, unchanged.
	$effect(() => {
		insufficientFundsForFee = insufficientNativeBalanceForFee || validation.insufficientFundsForFee;
	});

	// `TokenInput` writes this too, but only from its own debounced pass, which is triggered by a
	// change of amount or token and by nothing else. On a step remounted with the amount already
	// filled in - "Back" then "Next" again - that single pass runs while the gas fee is still in
	// flight, resolves to "nothing settled yet", and is never re-run once the fee lands: the field
	// kept a normal border, no message and a blue "Max" while "Next" was correctly blocked. Feeding
	// it the same synchronous validation that gates "Next" repaints it on mount and again on every
	// fee or balance change. `pending` is skipped rather than cleared: an empty or out-of-range
	// amount resolves to it as well, and `TokenInput` owns the message for those.
	$effect(() => {
		if (!validation.pending) {
			insufficientFundsError = validation.fieldError;
		}
	});

	// Synchronous and independent of `TokenInput`'s own debounced validation cycle: recomputed the
	// instant `amount` (or a balance/fee it depends on) changes, so a fast "Next" click - or a
	// wizard step remounted right after "Back" - can never navigate past a check that has not caught
	// up yet. `validation.pending` keeps this blocked while the gas fee itself is still loading,
	// rather than reading an unconfirmed fee as "no issue".
	$effect(() => {
		insufficientFunds =
			(!invalidAmount(amount) && isNullish(parsedAmount)) ||
			validation.pending ||
			nonNullish(validation.fieldError) ||
			validation.insufficientTokenBalance ||
			validation.insufficientFundsForFee;
	});

	const customValidate = (userAmount: bigint): Error | undefined =>
		evaluateAmount(userAmount).fieldError;
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
		bind:amountSetToMax
		bind:error={insufficientFundsError}
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
				<!-- Until the fee is known, "Max" for a native send would offer the entire balance:
				     `getMaxTransactionAmount` treats a missing fee as zero, so the amount could not
				     cover its own gas. Wait for the fee rather than offer an unspendable maximum,
				     the same way the swap form does. An ERC-20 max does not depend on the fee. -->
				{#if !feeIsPaidFromAmount || nonNullish($maxGasFee)}
					<MaxBalanceButton
						balance={$sendBalance}
						error={nonNullish(insufficientFundsError)}
						fee={$maxGasFee}
						token={$sendToken}
						bind:amount
						bind:amountSetToMax
					/>
				{:else}
					<div class="w-14 sm:w-16">
						<SkeletonText />
					</div>
				{/if}
			{/if}
		{/snippet}
	</TokenInput>
</div>

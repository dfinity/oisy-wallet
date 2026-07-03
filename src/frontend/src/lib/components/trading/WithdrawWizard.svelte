<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { Principal } from '@icp-sdk/core/principal';
	import type { IcToken } from '$icp/types/ic-token';
	import WithdrawForm from '$lib/components/trading/WithdrawForm.svelte';
	import WithdrawProgress from '$lib/components/trading/WithdrawProgress.svelte';
	import WithdrawReview from '$lib/components/trading/WithdrawReview.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
	} from '$lib/enums/plausible';
	import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
	import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
	import { withdrawFromOisyTrade } from '$lib/services/oisy-trade.services';
	import { trackTrading } from '$lib/services/trading-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';

	interface Props {
		token: IcToken;
		amount: OptionAmount;
		amountSetToMax?: boolean;
		reserved: bigint;
		withdrawProgressStep: string;
		currentStep?: WizardStep<WizardStepsTradingWithdraw>;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}

	let {
		token,
		amount = $bindable(),
		amountSetToMax = $bindable(false),
		reserved,
		withdrawProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	let transferFee = $derived(token.fee);

	const withdraw = async () => {
		if (isNullish($authIdentity)) {
			toastsError({ msg: { text: $i18n.auth.error.no_internet_identity } });
			return;
		}

		// Reject nullish, non-finite (NaN/Infinity) and non-positive amounts before
		// advancing — otherwise the service call fails later during parsing/validation.
		if (isNullish(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		onNext();

		trackTrading({
			subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.WITHDRAW,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			token: token.symbol
		});

		try {
			await withdrawFromOisyTrade({
				identity: $authIdentity,
				tokenId: { ledger_id: Principal.fromText(token.ledgerCanisterId) },
				amount: `${amount}`,
				decimals: token.decimals,
				progress: (step) => (withdrawProgressStep = step)
			});

			withdrawProgressStep = ProgressStepsTradingWithdraw.DONE;

			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.WITHDRAW,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: token.symbol
			});

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.WITHDRAW,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				token: token.symbol,
				error: replaceIcErrorFields(err)
			});
			toastsError({ msg: { text: $i18n.trading.withdraw.error }, err });

			onBack();
		}
	};
</script>

{#if currentStep?.name === WizardStepsTradingWithdraw.REVIEW}
	<WithdrawReview {amount} {onBack} onConfirm={withdraw} {transferFee} />
{:else if currentStep?.name === WizardStepsTradingWithdraw.WITHDRAWING}
	<WithdrawProgress symbol={token.symbol} {withdrawProgressStep} />
{:else}
	<WithdrawForm {onClose} {onNext} {reserved} {transferFee} bind:amount bind:amountSetToMax />
{/if}

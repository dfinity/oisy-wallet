<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { Principal } from '@icp-sdk/core/principal';
	import type { IcToken } from '$icp/types/ic-token';
	import WithdrawForm from '$lib/components/trading/WithdrawForm.svelte';
	import WithdrawProgress from '$lib/components/trading/WithdrawProgress.svelte';
	import WithdrawReview from '$lib/components/trading/WithdrawReview.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
	import { WizardStepsTradingWithdraw } from '$lib/enums/wizard-steps';
	import { withdrawFromOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';

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
		if (isNullish($authIdentity) || isNullish(amount)) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });
			return;
		}

		onNext();

		try {
			await withdrawFromOisyTrade({
				identity: $authIdentity,
				tokenId: { ledger_id: Principal.fromText(token.ledgerCanisterId) },
				amount: `${amount}`,
				decimals: token.decimals,
				progress: (step) => (withdrawProgressStep = step)
			});

			withdrawProgressStep = ProgressStepsTradingWithdraw.DONE;

			setTimeout(onClose, 750);
		} catch (err: unknown) {
			toastsError({ msg: { text: $i18n.trading.withdraw.error }, err });

			onBack();
		}
	};
</script>

{#if currentStep?.name === WizardStepsTradingWithdraw.REVIEW}
	<WithdrawReview {amount} {transferFee} {onBack} onConfirm={withdraw} />
{:else if currentStep?.name === WizardStepsTradingWithdraw.WITHDRAWING}
	<WithdrawProgress symbol={token.symbol} {withdrawProgressStep} />
{:else}
	<WithdrawForm {reserved} {transferFee} {onClose} {onNext} bind:amount bind:amountSetToMax />
{/if}

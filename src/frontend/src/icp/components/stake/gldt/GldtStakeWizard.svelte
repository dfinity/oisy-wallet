<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import GldtStakeForm from '$icp/components/stake/gldt/GldtStakeForm.svelte';
	import GldtStakeReview from '$icp/components/stake/gldt/GldtStakeReview.svelte';
	import StakeProgress from '$lib/components/stake/StakeProgress.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { WizardStepsStake } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		stakeProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const stake = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		onNext();

		try {
			stakeProgressStep = ProgressStepsStake.DONE;

			// TODO: implement stake service and call it here

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsStake.STAKE}
		<GldtStakeForm {onClose} {onNext} bind:amount />
	{:else if currentStep?.name === WizardStepsStake.REVIEW}
		<GldtStakeReview {amount} {onBack} onStake={stake} />
	{:else if currentStep?.name === WizardStepsStake.STAKING}
		<StakeProgress {stakeProgressStep} />
	{/if}
{/key}

<script lang="ts">
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';

	// Stands in for a stake or unstake wizard: it shows the step and closes or moves on when asked,
	// so a modal spec can reach any step without a real deposit or withdrawal.
	interface Props {
		amount: OptionAmount;
		currentStep?: WizardStep;
		stakeProgressStep?: string;
		unstakeProgressStep?: string;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		currentStep,
		stakeProgressStep = $bindable(),
		unstakeProgressStep = $bindable(),
		onClose,
		onNext
	}: Props = $props();
</script>

<p data-tid="stake-wizard-stub-step">{currentStep?.name}</p>
<button data-tid="stake-wizard-stub-next" onclick={onNext} type="button">next</button>
<button data-tid="stake-wizard-stub-close" onclick={onClose} type="button">close</button>

<!-- Stubs the chain-specific `SendWizard` when unit-testing `SendModal`'s amount handling and steps. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProgressStepsSend } from '$lib/enums/progress-steps';
	import type { WizardStep } from '$lib/types/wizard';
	import { countStubWizardMount } from '$tests/utils/send-wizard-stub-mounts.test-utils';

	interface Props {
		currentStep?: WizardStep;
		amount?: number;
		sendProgressStep: ProgressStepsSend;
		onBack: () => void;
		onNext: () => void;
		onSendBack: () => void;
		onTokensList: () => void;
	}

	let {
		currentStep,
		amount = $bindable(),
		sendProgressStep = $bindable(),
		onBack,
		onNext,
		onSendBack,
		onTokensList
	}: Props = $props();

	onMount(countStubWizardMount);
</script>

<span data-tid="stub-step">{currentStep?.name ?? ''}</span>
<span data-tid="stub-amount">{amount ?? ''}</span>
<span data-tid="stub-progress-step">{sendProgressStep}</span>
<button data-tid="stub-set-amount" onclick={() => (amount = 5)}>set amount</button>
<button data-tid="stub-next" onclick={onNext}>next</button>
<button data-tid="stub-back" onclick={onBack}>back</button>
<button data-tid="stub-send-back" onclick={onSendBack}>back</button>
<button data-tid="stub-to-tokens-list" onclick={onTokensList}>tokens list</button>

<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import UnstakeWizard from '$lib/components/stake/UnstakeWizard.svelte';
	import { unstakeWizardSteps } from '$lib/config/stake.config';
	import { ProgressStepsUnstake } from '$lib/enums/progress-steps';
	import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		token: Token;
		totalStaked: OptionBalance;
	}

	let { token, totalStaked }: Props = $props();

	let modal: WizardModal<WizardStepsUnstake> | undefined = $state();
	let currentStep: WizardStep<WizardStepsUnstake> | undefined = $state();
	let unstakeProgressStep: string = $state(ProgressStepsUnstake.INITIALIZATION);
	let amount: OptionAmount = $state();

	let steps: WizardSteps<WizardStepsUnstake> = $derived(
		unstakeWizardSteps({
			i18n: $i18n,
			tokenSymbol: getTokenDisplaySymbol(token)
		})
	);

	const reset = () => {
		amount = undefined;

		unstakeProgressStep = ProgressStepsUnstake.INITIALIZATION;

		currentStep = undefined;
	};

	const close = () =>
		closeModal(() => {
			reset();
		});
</script>

<SendTokenContext customSendBalance={totalStaked} {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsUnstake.UNSTAKING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<UnstakeWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			bind:amount
			bind:unstakeProgressStep
		/>
	</WizardModal>
</SendTokenContext>

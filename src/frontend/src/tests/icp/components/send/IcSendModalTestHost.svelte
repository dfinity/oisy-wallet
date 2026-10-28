<script lang="ts">
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import TokenActionContext from '$lib/components/send/TokenActionContext.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { mockPrincipalText } from '$tests/mocks/identity.mock';

	interface Props {
		token?: Token;
		onClose: () => void;
	}

	let { token = ICP_TOKEN, onClose }: Props = $props();
	let currentStep = $state<WizardStep<WizardStepsSend> | undefined>();
	let modal = $state<WizardModal<WizardStepsSend>>();
	let amount = $state<number | undefined>(0.0025);
	let sendProgressStep = $state<string>(ProgressStepsSendIc.INITIALIZATION);
	let open = $state(true);
	const steps: WizardSteps<WizardStepsSend> = [
		{ name: WizardStepsSend.REVIEW, title: WizardStepsSend.REVIEW },
		{ name: WizardStepsSend.SENDING, title: WizardStepsSend.SENDING }
	];
	const close = () => {
		open = false;
		onClose();
	};
	const back = () => modal?.back();
</script>

<span data-tid="send-lifecycle-progress">{sendProgressStep}</span>

{#if open}
	<TokenActionContext {token}>
		<WizardModal
			bind:this={modal}
			disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING}
			onClose={close}
			{steps}
			bind:currentStep
		>
			{#snippet title()}{$i18n.send.text.send}{/snippet}
			{#if currentStep?.name === WizardStepsSend.REVIEW || currentStep?.name === WizardStepsSend.SENDING}
				<IcSendTokenWizard
					{currentStep}
					destination={mockPrincipalText}
					onBack={back}
					onClose={close}
					onNext={() => modal?.next()}
					onSendBack={back}
					onTokensList={back}
					bind:amount
					bind:sendProgressStep
				/>
			{/if}
		</WizardModal>
	</TokenActionContext>
{/if}

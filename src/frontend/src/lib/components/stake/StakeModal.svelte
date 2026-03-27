<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Erc20Token } from '$eth/types/erc20';
	import { getHarvestAutopilotBaseTrackingMetadata } from '$eth/utils/harvest-autopilots.utils';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import StakeWizard from '$lib/components/stake/StakeWizard.svelte';
	import { stakeWizardSteps } from '$lib/config/stake.config';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { WizardStepsStake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { Vault } from '$lib/types/vaults';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		token: Token;
		vault?: Vault;
	}

	let { token, vault }: Props = $props();

	let modal: WizardModal<WizardStepsStake> | undefined = $state();
	let currentStep: WizardStep<WizardStepsStake> | undefined = $state();
	let stakeProgressStep: string = $state(ProgressStepsStake.INITIALIZATION);
	let amount: OptionAmount = $state();

	const steps: WizardSteps<WizardStepsStake> = $derived(
		stakeWizardSteps({
			i18n: $i18n
		})
	);

	const reset = () => {
		amount = undefined;

		stakeProgressStep = ProgressStepsStake.INITIALIZATION;

		currentStep = undefined;
	};

	const close = () =>
		closeModal(() => {
			if (stakeProgressStep !== ProgressStepsStake.DONE && nonNullish(vault)) {
				trackEvent({
					name: PLAUSIBLE_EVENTS.STAKE,
					metadata: {
						...getHarvestAutopilotBaseTrackingMetadata({
							assetToken: token as Erc20Token,
							vaultToken: vault.token
						}),
						source_detail1: currentStep?.name === WizardStepsStake.REVIEW ? 'review' : 'form',
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
					}
				});
			}

			reset();
		});
</script>

<SendTokenContext {token}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsStake.STAKING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<StakeWizard
			{currentStep}
			onBack={modal.back}
			onClose={close}
			onNext={modal.next}
			{vault}
			bind:amount
			bind:stakeProgressStep
		/>
	</WizardModal>
</SendTokenContext>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Erc20Token } from '$eth/types/erc20';
	import { getHarvestAutopilotBaseTrackingMetadata } from '$eth/utils/harvest-autopilots.utils';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import UnstakeWizard from '$lib/components/stake/UnstakeWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import { unstakeWizardSteps } from '$lib/config/stake.config';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { ProgressStepsUnstake } from '$lib/enums/progress-steps';
	import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { Vault } from '$lib/types/vaults';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		token: Token;
		totalStaked: bigint;
		vault?: Vault;
	}

	let { token, totalStaked, vault }: Props = $props();

	let modal: WizardModal<WizardStepsUnstake> | undefined = $state();
	let currentStep: WizardStep<WizardStepsUnstake> | undefined = $state();
	let unstakeProgressStep: string = $state(ProgressStepsUnstake.INITIALIZATION);
	let amount: OptionAmount = $state();

	let steps: WizardSteps<WizardStepsUnstake> = $derived(
		unstakeWizardSteps({
			i18n: $i18n
		})
	);

	const reset = () => {
		amount = undefined;

		unstakeProgressStep = ProgressStepsUnstake.INITIALIZATION;

		currentStep = undefined;
	};

	const close = () =>
		closeModal(() => {
			if (unstakeProgressStep !== ProgressStepsUnstake.DONE && nonNullish(vault)) {
				trackEvent({
					name: PLAUSIBLE_EVENTS.UNSTAKE,
					metadata: {
						...getHarvestAutopilotBaseTrackingMetadata({
							assetToken: token as Erc20Token,
							vaultToken: vault.token
						}),
						source_detail1: currentStep?.name === WizardStepsUnstake.REVIEW ? 'review' : 'form',
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.CANCEL
					}
				});
			}

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
			{vault}
			bind:amount
			bind:unstakeProgressStep
		/>
	</WizardModal>
</SendTokenContext>

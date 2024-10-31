<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';
	import IcSendTokenWizard from '$icp/components/send/IcSendTokenWizard.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { ckEthereumTwinToken } from '$icp-eth/derived/cketh.derived';
	import SendTokenContext from '$lib/components/send/SendTokenContext.svelte';
	import { sendWizardStepsWithQrCodeScan } from '$lib/config/send.config';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { closeModal } from '$lib/utils/modal.utils';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { goToWizardSendStep } from '$lib/utils/wizard-modal.utils';

	/**
	 * Props
	 */

	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Send
	 */

	let sendProgressStep: string = ProgressStepsSendIc.INITIALIZATION;

	let firstStep: WizardStep;
	let otherSteps: WizardStep[];
	$: [firstStep, ...otherSteps] = sendWizardStepsWithQrCodeScan({
		i18n: $i18n,
		converting: isNetworkIdBitcoin(networkId) || isNetworkIdEthereum(networkId)
	});

	let steps: WizardSteps;
	$: steps = [
		{
			...firstStep,
			title: isNetworkIdBitcoin(networkId)
				? $i18n.convert.text.convert_to_btc
				: isNetworkIdEthereum(networkId)
					? replacePlaceholders($i18n.convert.text.convert_to_token, {
							$token: $ckEthereumTwinToken.symbol
						})
					: $i18n.send.text.send
		},
		...otherSteps
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			destination = '';
			amount = undefined;
			networkId = undefined;

			sendProgressStep = ProgressStepsSendIc.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	let source: string;
	$: source = $icrcAccountIdentifierText ?? '';
</script>

<WizardModal
	{steps}
	bind:currentStep
	bind:this={modal}
	on:nnsClose={close}
	disablePointerEvents={currentStep?.name === WizardStepsSend.SENDING}
>
	<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

	<SendTokenContext token={$token}>
		<IcSendTokenWizard
			{source}
			{currentStep}
			bind:destination
			bind:networkId
			bind:amount
			bind:sendProgressStep
			on:icBack={modal.back}
			on:icNext={modal.next}
			on:icClose={close}
			on:icQRCodeScan={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.QR_CODE_SCAN
				})}
			on:icQRCodeBack={() =>
				goToWizardSendStep({
					modal,
					steps,
					stepName: WizardStepsSend.SEND
				})}
		/>
	</SendTokenContext>
</WizardModal>

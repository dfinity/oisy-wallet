<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import EthConvertTokenWizard from '$eth/components/convert/EthConvertTokenWizard.svelte';
	import { receiveWizardSteps, type WizardStepsReceiveComplete } from '$eth/config/receive.config';
	import HowToConvertEthereumWizardSteps from '$icp/components/convert/HowToConvertEthereumWizardSteps.svelte';
	import IcReceiveInfoCkEthereum from '$icp/components/receive/IcReceiveInfoCkEthereum.svelte';
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import ConvertContexts from '$lib/components/convert/ConvertContexts.svelte';
	import ReceiveAddressQrCode from '$lib/components/receive/ReceiveAddressQrCode.svelte';
	import { ProgressStepsConvert, ProgressStepsSend } from '$lib/enums/progress-steps';
	import {
		WizardStepsConvert,
		WizardStepsHowToConvert,
		WizardStepsReceive
	} from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { closeModal } from '$lib/utils/modal.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		sourceToken: Token;
		destinationToken: Token;
	}

	let { sourceToken, destinationToken }: Props = $props();

	let sendAmount: OptionAmount = $state();
	let receiveAmount: number | undefined = $state();
	let convertProgressStep: string = $state(ProgressStepsConvert.INITIALIZATION);
	let currentStep: WizardStep<WizardStepsReceiveComplete> | undefined = $state();
	let modal: WizardModal<WizardStepsReceiveComplete> | undefined = $state();

	let steps: WizardSteps<WizardStepsReceiveComplete> = $derived(
		receiveWizardSteps({
			i18n: $i18n,
			sourceToken: sourceToken.symbol,
			destinationToken: destinationToken.symbol
		})
	);

	const dispatch = createEventDispatcher();

	const close = () =>
		closeModal(() => {
			sendAmount = undefined;
			receiveAmount = undefined;

			convertProgressStep = ProgressStepsSend.INITIALIZATION;

			currentStep = undefined;

			dispatch('nnsClose');
		});

	const goToStep = (
		stepName: WizardStepsHowToConvert | WizardStepsConvert | WizardStepsReceive
	) => {
		if (nonNullish(modal)) {
			goToWizardStep({
				modal,
				steps,
				stepName
			});
		}
	};
</script>

<ConvertContexts {destinationToken} {sourceToken}>
	<WizardModal
		bind:this={modal}
		disablePointerEvents={currentStep?.name === WizardStepsConvert.CONVERTING}
		onClose={close}
		{steps}
		bind:currentStep
	>
		{#snippet title()}{currentStep?.title ?? ''}{/snippet}

		<EthConvertTokenWizard
			{currentStep}
			formCancelAction="back"
			onBack={() =>
				currentStep?.name === WizardStepsConvert.CONVERT
					? goToStep(WizardStepsHowToConvert.INFO)
					: modal?.back()}
			onClose={close}
			onNext={modal?.next}
			bind:sendAmount
			bind:receiveAmount
			bind:convertProgressStep
		>
			{#if currentStep?.name === WizardStepsHowToConvert.INFO || currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE}
				<HowToConvertEthereumWizardSteps
					{currentStep}
					formCancelAction="back"
					on:icBack={() =>
						goToStep(
							currentStep?.name === WizardStepsHowToConvert.ETH_QR_CODE
								? WizardStepsHowToConvert.INFO
								: WizardStepsReceive.RECEIVE
						)}
					on:icQRCode={() => goToStep(WizardStepsHowToConvert.ETH_QR_CODE)}
					on:icConvert={() => goToStep(WizardStepsConvert.CONVERT)}
				/>
			{:else if currentStep?.name === WizardStepsReceive.QR_CODE}
				<ReceiveAddressQrCode
					address={$icrcAccountIdentifierText ?? ''}
					addressToken={ICP_TOKEN}
					copyAriaLabel={$i18n.receive.icp.text.internet_computer_principal_copied}
					network={ICP_NETWORK}
					qrCodeAction={{ enabled: false }}
					on:icBack={modal?.back}
				/>
			{:else}
				<IcReceiveInfoCkEthereum
					on:icQRCode={() => goToStep(WizardStepsReceive.QR_CODE)}
					on:icHowToConvert={() => goToStep(WizardStepsHowToConvert.INFO)}
				/>
			{/if}
		</EthConvertTokenWizard>
	</WizardModal>
</ConvertContexts>

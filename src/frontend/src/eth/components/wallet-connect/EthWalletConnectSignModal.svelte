<script lang="ts">

	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { run } from 'svelte/legacy';
	import WalletConnectSignReview from '$eth/components/wallet-connect/WalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$eth/constants/steps.constants';
	import { signMessage } from '$eth/services/wallet-connect.services';
	import { getSignParamsMessageTypedDataV4 } from '$eth/utils/wallet-connect.utils';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSign } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
	}

	let { listener = $bindable(), request }: Props = $props();

	let {
		domain: { name: domainName }
	} = $derived(getSignParamsMessageTypedDataV4(request.params.request.params));

	/**
	 * Modal
	 */

	const steps: WizardSteps<WizardStepsSign> = [
		{
			name: WizardStepsSign.REVIEW,
			title: $i18n.send.text.review
		},
		{
			name: WizardStepsSign.SIGNING,
			title: $i18n.send.text.signing
		}
	];

	let currentStep = $state<WizardStep<WizardStepsSign> | undefined>();
	let modal = $state<WizardModal<WizardStepsSign>>();

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	let signProgressStep = $state<ProgressStepsSign>(ProgressStepsSign.INITIALIZATION);

	/**
	 * Reject a message
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	const approve = async () => {
		if (isNullish(modal)) {
			return;
		}

		const { success } = await signMessage({
			request,
			listener,
			modalNext: modal.next,
			progress: (step: ProgressStepsSign) => (signProgressStep = step)
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{#snippet title()}
		<WalletConnectModalTitle
			>{domainName ?? $i18n.wallet_connect.text.sign_message}</WalletConnectModalTitle
		>
	{/snippet}

	{#if currentStep?.name === WizardStepsSign.SIGNING}
		<InProgressWizard progressStep={signProgressStep} steps={walletConnectSignSteps($i18n)} />
	{:else if currentStep?.name === WizardStepsSign.REVIEW}
		<WalletConnectSignReview onApprove={approve} onReject={reject} {request} />
	{/if}
</WizardModal>

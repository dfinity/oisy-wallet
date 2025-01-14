<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import WalletConnectSignReview from '$eth/components/wallet-connect/WalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$eth/constants/steps.constants';
	import { signMessage, reject as rejectServices } from '$eth/services/wallet-connect.services';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	export let listener: OptionWalletConnectListener;
	export let request: Web3WalletTypes.SessionRequest;

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: 'Review',
			title: $i18n.send.text.review
		},
		{
			name: 'Signing',
			title: $i18n.send.text.signing
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	let signProgressStep: string = ProgressStepsSign.INITIALIZATION;

	/**
	 * Reject a message
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	const approve = async () => {
		const { success } = await signMessage({
			request,
			listener,
			modalNext: modal.next,
			progress: (step: ProgressStepsSign) => (signProgressStep = step)
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<WalletConnectModalTitle slot="title"
		>{$i18n.wallet_connect.text.sign_message}</WalletConnectModalTitle
	>

	{#if currentStep?.name === 'Signing'}
		<SendProgress progressStep={signProgressStep} steps={walletConnectSignSteps($i18n)} />
	{:else}
		<WalletConnectSignReview {request} on:icApprove={approve} on:icReject={reject} />
	{/if}
</WizardModal>

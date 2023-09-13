<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import { SignStep } from '$lib/enums/steps';
	import WalletConnectSignReview from '$lib/components/wallet-connect/WalletConnectSignReview.svelte';
	import { WALLET_CONNECT_SIGN_STEPS } from '$lib/constants/steps.constants';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { signMessage, reject as rejectServices } from '$lib/services/wallet-connect.services';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';

	export let listener: WalletConnectListener | undefined | null;
	export let request: Web3WalletTypes.SessionRequest;

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Signing',
			title: 'Signing...'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	let signProgressStep: string = SignStep.INITIALIZATION;

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
			progress: (step: SignStep) => (signProgressStep = step)
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<WalletConnectModalTitle slot="title">Sign Message</WalletConnectModalTitle>

	{#if currentStep?.name === 'Signing'}
		<SendProgress progressStep={signProgressStep} steps={WALLET_CONNECT_SIGN_STEPS} />
	{:else}
		<WalletConnectSignReview {request} on:icApprove={approve} on:icReject={reject} />
	{/if}
</WizardModal>

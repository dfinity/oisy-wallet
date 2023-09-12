<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { getSignParamsMessageHex } from '$lib/utils/wallet-connect.utils';
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import { signMessage } from '$lib/api/backend.api';
	import { SignStep } from '$lib/enums/steps';
	import WalletConnectSignReview from '$lib/components/wallet-connect/WalletConnectSignReview.svelte';
	import { WALLET_CONNECT_SIGN_STEPS } from '$lib/constants/steps.constants';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { execute, reject as rejectServices } from '$lib/services/wallet-connect.services';

	export let listener: WalletConnectListener | undefined | null;
	export let request: Web3WalletTypes.SessionRequest;

	const close = () => modalStore.close();

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

	let signProgressStep: string = SignStep.INITIALIZATION;

	type CallBackParams = {
		request: Web3WalletTypes.SessionRequest;
		listener: WalletConnectListener;
	};

	/**
	 * Reject a message
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	const approve = async () => {
		const { success } = await execute({
			params: { request, listener },
			callback: async ({ request, listener }: CallBackParams) => {
				const {
					id,
					topic,
					params: {
						request: { params }
					}
				} = request;

				modal.next();

				try {
					signProgressStep = SignStep.SIGN;

					const message = getSignParamsMessageHex(params);

					const signedMessage = await signMessage(message);

					signProgressStep = SignStep.APPROVE;

					await listener.approveRequest({ topic, id, message: signedMessage });

					signProgressStep = SignStep.DONE;

					setTimeout(() => close(), 750);
				} catch (err: unknown) {
					// TODO: better error rejection
					await listener.rejectRequest({ topic, id });

					throw err;
				}
			},
			toastMsg: 'WalletConnect request approved.'
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<svelte:fragment slot="title">Sign Message</svelte:fragment>

	{#if currentStep?.name === 'Signing'}
		<SendProgress progressStep={signProgressStep} steps={WALLET_CONNECT_SIGN_STEPS} />
	{:else}
		<WalletConnectSignReview {request} on:icApprove={approve} on:icReject={reject} />
	{/if}
</WizardModal>

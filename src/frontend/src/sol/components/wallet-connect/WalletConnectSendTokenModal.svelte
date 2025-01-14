<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { getContext } from 'svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSend, ProgressStepsSendSol } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import SolSendProgress from '$sol/components/send/SolSendProgress.svelte';
	import WalletConnectSendReview from '$sol/components/wallet-connect/WalletConnectSendReview.svelte';
	import { signAndSendTransaction as sendServices } from '$sol/services/wallet-connect.services';
	import type { SolanaNetwork } from '$sol/types/network';
	import type { WalletConnectSolSendTransactionParams } from '$sol/types/wallet-connect';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectSolSendTransactionParams;
	export let network: SolanaNetwork;

	/**
	 * Send context store
	 */

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Network
	 */

	let destination = '';
	$: destination = firstTransaction.to ?? '';

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: WizardStepsSend.REVIEW,
			title: $i18n.send.text.review
		},
		{
			name: WizardStepsSend.SENDING,
			title: $i18n.send.text.sending
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	export let listener: OptionWalletConnectListener;

	/**
	 * Reject a transaction
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	/**
	 * Send and approve
	 */

	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	let amount: BigNumber;
	$: amount = BigNumber.from(firstTransaction?.value ?? '0');

	const send = async () => {
		const { success } = await sendServices({
			request,
			listener,
			address: $ethAddress,
			amount,
			modalNext: modal.next,
			token: $sendToken,
			onProgress: () => {
				if (sendProgressStep === ProgressStepsSendSol.INITIALIZATION) {
					sendProgressStep = ProgressStepsSendSol.SEND;
				} else if (sendProgressStep === ProgressStepsSendSol.SEND) {
					sendProgressStep = ProgressStepsSendSol.DONE;
				}
			},
			identity: $authIdentity
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	{@const data = firstTransaction.data}

	<WalletConnectModalTitle slot="title">{$i18n.send.text.send}</WalletConnectModalTitle>

	{#if currentStep?.name === WizardStepsSend.SENDING}
		<SolSendProgress bind:sendProgressStep />
	{:else}
		<WalletConnectSendReview
			{amount}
			{destination}
			{data}
			{network}
			on:icApprove={send}
			on:icReject={reject}
		/>
	{/if}
</WizardModal>

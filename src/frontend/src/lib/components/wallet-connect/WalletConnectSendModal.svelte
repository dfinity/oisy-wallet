<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import {
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish } from '@dfinity/utils';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$lib/types/wallet-connect';
	import { toastsError } from '$lib/stores/toasts.store';
	import FeeContext from '$lib/components/fee/FeeContext.svelte';
	import { setContext } from 'svelte';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$lib/stores/fee.store';
	import { addressStore } from '$lib/stores/address.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectSendReview from '$lib/components/wallet-connect/WalletConnectSendReview.svelte';
	import { SendStep } from '$lib/enums/steps';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { send as executeSend } from '$lib/services/send.services';
	import { token } from '$lib/derived/token.derived';
	import { WALLET_CONNECT_SEND_STEPS } from '$lib/constants/steps.constants';
	import { execute, reject as rejectServices } from '$lib/services/wallet-connect.services';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;

	/**
	 * Fee context store
	 */

	let storeFeeData = initFeeStore();

	setContext<FeeContextType>(FEE_CONTEXT_KEY, {
		store: storeFeeData
	});

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: 'Review',
			title: 'Review'
		},
		{
			name: 'Sending',
			title: 'Sending...'
		}
	];

	let currentStep: WizardStep | undefined;
	let modal: WizardModal;

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	export let listener: WalletConnectListener | undefined | null;

	type CallBackParams = {
		request: Web3WalletTypes.SessionRequest;
		listener: WalletConnectListener;
	};

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

	let sendProgressStep: string = SendStep.INITIALIZATION;

	let amount: BigNumber;
	$: amount = BigNumber.from(firstTransaction?.value ?? '0');

	const send = async () => {
		const { success } = await execute({
			params: { request, listener },
			callback: async ({ request, listener }: CallBackParams) => {
				const { id, topic } = request;

				const firstParam = request?.params.request.params?.[0];

				if (isNullish(firstParam)) {
					toastsError({
						msg: { text: `Unknown parameter.` }
					});
					return;
				}

				if (isNullish($addressStore)) {
					toastsError({
						msg: { text: `Unexpected error. Your wallet address is not initialized.` }
					});
					return;
				}

				if (firstParam.from?.toLowerCase() !== $addressStore.toLowerCase()) {
					toastsError({
						msg: {
							text: `From address requested for the transaction is not the address of this wallet.`
						}
					});
					return;
				}

				if (isNullish(firstParam.to)) {
					toastsError({
						msg: { text: `Unknown destination address.` }
					});
					return;
				}

				if (isNullish($storeFeeData)) {
					toastsError({
						msg: { text: `Gas fees are not defined.` }
					});
					return;
				}

				const { maxFeePerGas, maxPriorityFeePerGas } = $storeFeeData;

				if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
					toastsError({
						msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
					});
					return;
				}

				const { to, gas: gasWC, data } = firstParam;

				modal.next();

				try {
					const { hash } = await executeSend({
						from: $addressStore,
						to,
						progress: (step: SendStep) => (sendProgressStep = step),
						lastProgressStep: SendStep.APPROVE,
						token: $token,
						amount,
						maxFeePerGas,
						maxPriorityFeePerGas,
						gas: BigNumber.from(gasWC),
						data
					});

					await listener.approveRequest({ id, topic, message: hash });

					sendProgressStep = SendStep.DONE;
				} catch (err: unknown) {
					// TODO: better error rejection
					await listener.rejectRequest({ topic, id });

					throw err;
				}
			},
			toastMsg: 'WalletConnect eth_sendTransaction request executed.'
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<svelte:fragment slot="title">Send</svelte:fragment>

	{@const destination = firstTransaction.to ?? ''}

	<FeeContext amount={amount.toString()} {destination} observe={currentStep?.name !== 'Sending'}>
		{#if currentStep?.name === 'Sending'}
			<SendProgress progressStep={sendProgressStep} steps={WALLET_CONNECT_SEND_STEPS} />
		{:else}
			<WalletConnectSendReview {amount} {destination} on:icApprove={send} on:icReject={reject} />
		{/if}
	</FeeContext>
</WizardModal>

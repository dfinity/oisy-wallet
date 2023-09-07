<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import {
		type ProgressStep,
		WizardModal,
		type WizardStep,
		type WizardSteps
	} from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { busy } from '$lib/stores/busy.store';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$lib/types/wallet-connect';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
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
	import { SendStep } from '$lib/enums/send';
	import SendProgress from '$lib/components/send/SendProgress.svelte';
	import { send as executeSend } from '$lib/services/send.services';
	import { token } from '$lib/derived/token.derived';

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

	const reject = async () =>
		await execute({
			callback: async ({ request, listener }: CallBackParams) => {
				busy.start();

				const { id, topic } = request;

				try {
					await listener.rejectRequest({ topic, id });
				} finally {
					busy.stop();
				}
			},
			toastMsg: 'WalletConnect request rejected.'
		});

	/**
	 * Send and approve
	 */

	let sendProgressStep: string = SendStep.INITIALIZATION;

	const STEP_APPROVING: ProgressStep = {
		step: SendStep.APPROVE,
		text: 'Approving...',
		state: 'next'
	} as const;

	let amount: BigNumber;
	$: amount = BigNumber.from(firstTransaction?.value ?? '0');

	const send = async () =>
		await execute({
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

				if (isNullish(firstParam.value)) {
					toastsError({
						msg: { text: `Amount is not defined.` }
					});
					return;
				}

				if (isNullish($storeFeeData)) {
					toastsError({
						msg: { text: `Gas fees are not defined.` }
					});
					return;
				}

				const { maxFeePerGas, maxPriorityFeePerGas, gas } = $storeFeeData;

				if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
					toastsError({
						msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
					});
					return;
				}

				// TODO: we have gas issue. should we use the gas and gasLimit provided by WalletConnect?
				const { to } = firstParam;

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
						gas
					});

					await listener.approveRequest({ id, topic, message: hash });

					sendProgressStep = SendStep.DONE;

					setTimeout(() => close(), 750);
				} catch (err: unknown) {
					// TODO: better error rejection
					await listener.rejectRequest({ topic, id });

					throw err;
				}
			},
			toastMsg: 'WalletConnect eth_sendTransaction request executed.'
		});

	const execute = async ({
		callback,
		toastMsg
	}: {
		callback: (params: CallBackParams) => Promise<void>;
		toastMsg: string;
	}) => {
		if (isNullish(listener)) {
			toastsError({
				msg: { text: `Unexpected error: No connection opened.` }
			});

			close();
			return;
		}

		if (isNullish(request)) {
			toastsError({
				msg: { text: `Unexpected error: Request is not defined therefore cannot be processed.` }
			});

			close();
			return;
		}

		try {
			await callback({ request, listener });

			toastsShow({
				text: toastMsg,
				level: 'info',
				duration: 2000
			});
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Unexpected error while processing the request with WalletConnect.` },
				err
			});
		}

		close();
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<svelte:fragment slot="title">Send</svelte:fragment>

	{@const destination = firstTransaction.to ?? ''}

	<FeeContext amount={amount.toString()} {destination} observe={currentStep?.name !== 'Sending'}>
		{#if currentStep?.name === 'Sending'}
			<SendProgress progressStep={sendProgressStep} additionalSteps={[STEP_APPROVING]} />
		{:else}
			<WalletConnectSendReview {amount} {destination} on:icApprove={send} on:icReject={reject} />
		{/if}
	</FeeContext>
</WizardModal>

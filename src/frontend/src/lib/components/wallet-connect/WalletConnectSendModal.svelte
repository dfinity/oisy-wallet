<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { busy } from '$lib/stores/busy.store';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$lib/types/wallet-connect';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import { ETH_NETWORK_ID, ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { getFeeData, sendTransaction } from '$lib/providers/etherscan.providers';
	import { signTransaction } from '$lib/api/backend.api';
	import { isBusy } from '$lib/derived/busy.derived';
	import type { SignRequest } from '$declarations/backend/backend.did';
	import FeeContext from '$lib/components/fee/FeeContext.svelte';
	import { setContext } from 'svelte';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$lib/stores/fee.store';
	import { addressStore } from '$lib/stores/address.store';
	import SendData from '$lib/components/send/SendData.svelte';
	import {BigNumber} from "@ethersproject/bignumber";
	import {formatEtherShort} from "$lib/utils/format.utils";

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

	const reject = async () => {
		await execute({
			callback: async ({ request, listener }: CallBackParams) => {
				const { id, topic } = request;

				await listener.rejectRequest({ topic, id });
			},
			toastMsg: 'WalletConnect request rejected.'
		});

		close();
	};

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

				if (firstParam.from !== $addressStore) {
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

				// TODO: nonce
				if (isNullish(firstParam.nonce)) {
					toastsError({
						msg: { text: `Unknown nonce.` }
					});
					return;
				}

				if (isNullish(firstParam.value)) {
					toastsError({
						msg: { text: `Value not defined.` }
					});
					return;
				}

				try {
					const feeData = await getFeeData();

					const { maxFeePerGas, maxPriorityFeePerGas } = feeData;

					if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
						toastsError({
							msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
						});
						return;
					}

					const { value, nonce, to, gasPrice } = firstParam;

					// TODO: send
					// const nonce = await getTransactionCount(from);

					const transaction: SignRequest = {
						to,
						value: BigInt(value),
						chain_id: ETH_NETWORK_ID,
						nonce: BigInt(nonce),
						gas: nonNullish(gasPrice) ? BigInt(gasPrice) : ETH_BASE_FEE,
						max_fee_per_gas: maxFeePerGas.toBigInt(),
						max_priority_fee_per_gas: maxPriorityFeePerGas.toBigInt(),
						data: []
					};

					const rawTransaction = await signTransaction(transaction);

					const { hash } = await sendTransaction(rawTransaction);

					await listener.approveRequest({ id, topic, message: hash });
				} catch (err: unknown) {
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

		busy.start();

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

		busy.stop();

		close();
	};
</script>

<WizardModal {steps} bind:currentStep on:nnsClose={reject}>
	<svelte:fragment slot="title">Send</svelte:fragment>

	{@const amount = BigNumber.from(firstTransaction?.value ?? '0')}
	{@const destination = firstTransaction.to ?? ''}

	<FeeContext amount={Number(amount)} {destination} observe={currentStep?.name !== 'Sending'}>
		<SendData amount={formatEtherShort(amount)} {destination} />

		{#if nonNullish(firstTransaction.gasLimit)}
			<p class="font-bold">Gas limit</p>
			<p class="mb-2 font-normal">
				{BigInt(firstTransaction.gasLimit).toString()}
			</p>
		{/if}

		{#if nonNullish(firstTransaction.gasPrice)}
			<p class="font-bold">Gas price</p>
			<p class="mb-2 font-normal">
				{BigInt(firstTransaction.gasPrice).toString()}
			</p>
		{/if}

		<div class="flex justify-end gap-1 mt-4">
			<button class="primary" on:click={reject} disabled={$isBusy}>Reject</button>
			<button class="primary" on:click={send} disabled={$isBusy}> Approve </button>
		</div>
	</FeeContext>
</WizardModal>

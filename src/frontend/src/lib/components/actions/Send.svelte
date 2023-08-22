<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { signTransaction } from '$lib/api/backend.api';
	import {
		getFeeData,
		getTransactionCount,
		sendTransaction
	} from '$lib/providers/etherscan.providers';
	import { debounce, isNullish } from '@dfinity/utils';
	import { CHAIN_ID, ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { Utils } from 'alchemy-sdk';
	import { addressStore, addressStoreNotLoaded } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { balanceStoreEmpty } from '$lib/stores/balance.store';
	import { type WizardStep, type WizardSteps, WizardModal, Input } from '@dfinity/gix-components';
	import SendForm from '$lib/components/actions/SendForm.svelte';
	import SendReview from '$lib/components/actions/SendReview.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendProgress from '$lib/components/actions/SendProgress.svelte';
	import { SendStep } from '$lib/enums/send';
	import type { WebSocketListener } from '$lib/providers/alchemy.providers';
	import { onDestroy } from 'svelte';
	import { initMinedTransactionsListener } from '$lib/services/listener.services';
	import type { FeeData } from '@ethersproject/providers';

	/**
	 * Fee data
	 */

	let feeData: FeeData | undefined;
	let listener: WebSocketListener | undefined = undefined;

	const updateFeeData = async () => {
		try {
			feeData = await getFeeData();
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Cannot fetch gas fee.` },
				err
			});
		}
	};

	const debounceUpdateFeeData = debounce(updateFeeData);

	const initFeeData = async (modalOpen: boolean) => {
		listener?.removeAllListeners();

		if (!modalOpen) {
			return;
		}

		await updateFeeData();
		listener = initMinedTransactionsListener(async () => debounceUpdateFeeData());
	};
	onDestroy(() => listener?.removeAllListeners());

	$: initFeeData(visible);

	/**
	 * Send
	 */

	let sendProgressStep: string = SendStep.INITIALIZATION;

	const send = async () => {
		if (invalidDestination(destination)) {
			toastsError({
				msg: { text: `Destination address is invalid.` }
			});
			return;
		}

		if (invalidAmount(amount)) {
			toastsError({
				msg: { text: `Amount is invalid.` }
			});
			return;
		}

		if (isNullish(feeData)) {
			toastsError({
				msg: { text: `Gas fees are not defined.` }
			});
			return;
		}

		// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
		const { maxFeePerGas, maxPriorityFeePerGas } = feeData;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
			});
			return;
		}

		modal.next();

		try {
			const nonce = await getTransactionCount($addressStore!);

			const transaction = {
				to: destination!,
				value: Utils.parseEther(`${amount!}`).toBigInt(),
				chain_id: CHAIN_ID,
				nonce: BigInt(nonce),
				gas: ETH_BASE_FEE,
				max_fee_per_gas: maxFeePerGas.toBigInt(),
				max_priority_fee_per_gas: maxPriorityFeePerGas.toBigInt()
			} as const;

			sendProgressStep = SendStep.SIGN;

			const rawTransaction = await signTransaction(transaction);

			sendProgressStep = SendStep.SEND;

			await sendTransaction(rawTransaction);

			sendProgressStep = SendStep.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});
		}
	};

	let disabled: boolean;
	$: disabled =
		$addressStoreNotLoaded || $balanceStoreEmpty || sendProgressStep !== SendStep.INITIALIZATION;

	let visible = false;

	const steps: WizardSteps = [
		{
			name: 'Send',
			title: 'Send'
		},
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

	let destination = '';
	let amount: number | undefined = undefined;

	const close = () => {
		visible = false;

		destination = '';
		amount = undefined;

		feeData = undefined;

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<button
	class="flex-1 secondary"
	on:click={() => (visible = true)}
	{disabled}
	class:opacity-50={disabled}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if visible}
	<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={close}>
		<svelte:fragment slot="title">{currentStep?.title ?? ''}</svelte:fragment>

		{#if currentStep?.name === 'Review'}
			<SendReview on:icBack={modal.back} on:icSend={send} bind:destination bind:amount {feeData} />
		{:else if currentStep?.name === 'Sending'}
			<SendProgress progressStep={sendProgressStep} />
		{:else}
			<SendForm on:icNext={modal.next} on:icClose={close} bind:destination bind:amount {feeData} />
		{/if}
	</WizardModal>
{/if}

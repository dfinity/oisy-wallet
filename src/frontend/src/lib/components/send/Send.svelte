<script lang="ts">
	import { toastsError } from '$lib/stores/toasts.store';
	import { getFeeData } from '$lib/providers/etherscan.providers';
	import { getFeeData as getErc20FeeData } from '$lib/providers/etherscan-erc20.providers';
	import { send as executeSend } from '$lib/services/send.services';
	import { debounce, isNullish } from '@dfinity/utils';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { type WizardStep, type WizardSteps, WizardModal, Input } from '@dfinity/gix-components';
	import SendForm from '$lib/components/send/SendForm.svelte';
	import SendReview from '$lib/components/send/SendReview.svelte';
	import { invalidAmount, invalidDestination } from '$lib/utils/send.utils';
	import SendProgress from '$lib/components/send/SendProgress.svelte';
	import { SendStep } from '$lib/enums/send';
	import { onDestroy } from 'svelte';
	import { initMinedTransactionsListener } from '$lib/services/listener.services';
	import type { WebSocketListener } from '$lib/types/listener';
	import { modalStore } from '$lib/stores/modal.store';
	import { balanceEmpty } from '$lib/derived/balances.derived';
	import { addressNotLoaded } from '$lib/derived/address.derived';
	import { modalSend } from '$lib/derived/modal.derived';
	import { addressStore } from '$lib/stores/address.store';
	import { token } from '$lib/derived/token.derived';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import type { Erc20Token } from '$lib/types/erc20';
	import type { TransactionFeeData } from '$lib/types/transaction';
	import { BigNumber } from '@ethersproject/bignumber';
	import { ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { Utils } from 'alchemy-sdk';

	let destination = '';
	let amount: number | undefined = undefined;

	/**
	 * Fee data
	 */

	let feeData: TransactionFeeData | undefined;
	let listener: WebSocketListener | undefined = undefined;

	const updateFeeData = async () => {
		try {
			if ($token.id === ETHEREUM_TOKEN_ID) {
				feeData = {
					...(await getFeeData()),
					gas: BigNumber.from(ETH_BASE_FEE)
				};
				return;
			}

			feeData = {
				...(await getFeeData()),
				gas: await getErc20FeeData({
					contract: $token as Erc20Token,
					address: destination !== '' ? destination : $addressStore!,
					amount: Utils.parseEther(`${amount ?? '1'}`)
				})
			};
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Cannot fetch gas fee.` },
				err
			});
		}
	};

	const debounceUpdateFeeData = debounce(updateFeeData);

	const initFeeData = async (modalOpen: boolean) => {
		await listener?.disconnect();

		if (!modalOpen) {
			return;
		}

		await updateFeeData();
		listener = initMinedTransactionsListener(async () => debounceUpdateFeeData());
	};

	onDestroy(() => listener?.disconnect());

	$: initFeeData($modalSend);

	$: amount,
		destination,
		(() => {
			if ($token.id === ETHEREUM_TOKEN_ID) {
				return;
			}

			debounceUpdateFeeData();
		})();

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
		const { maxFeePerGas, maxPriorityFeePerGas, gas } = feeData;

		// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
		// exceeds block gas limit
		if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
			toastsError({
				msg: { text: `Max fee per gas or max priority fee per gas is undefined.` }
			});
			return;
		}

		modal.next();

		// TODO: display maxFeePerGas * gas (21_000 or value I found for ERC20)

		try {
			await executeSend({
				from: $addressStore!,
				to: destination!,
				progress: (step: SendStep) => (sendProgressStep = step),
				token: $token,
				amount: amount!,
				maxFeePerGas,
				maxPriorityFeePerGas,
				gas
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});

			modal.back();
		}
	};

	let disabled: boolean;
	$: disabled = $addressNotLoaded || $balanceEmpty || sendProgressStep !== SendStep.INITIALIZATION;

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

	const close = () => {
		modalStore.close();

		destination = '';
		amount = undefined;

		feeData = undefined;

		sendProgressStep = SendStep.INITIALIZATION;
	};
</script>

<button
	class="flex-1 secondary"
	on:click={modalStore.openSend}
	{disabled}
	class:opacity-50={disabled}
>
	<IconSend size="28" />
	<span>Send</span></button
>

{#if $modalSend}
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

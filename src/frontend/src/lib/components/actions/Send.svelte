<script lang="ts">
	import { busy, isBusy } from '$lib/stores/busy.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { signTransaction } from '$lib/api/backend.api';
	import {
		getFeeData,
		getTransactionCount,
		sendTransaction
	} from '$lib/providers/etherscan.providers';
	import { isNullish } from '@dfinity/utils';
	import { CHAIN_ID, CURRENCY_SYMBOL, ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { BigNumber, Utils } from 'alchemy-sdk';
	import { addressStore, addressStoreNotLoaded } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { balanceStore, balanceStoreEmpty } from '$lib/stores/balance.store';
	import { type WizardStep, type WizardSteps, WizardModal, Input } from '@dfinity/gix-components';
	import { formatEtherShort } from '$lib/utils/format.utils';
	import SendSource from '$lib/components/actions/SendSource.svelte';
	import SendDestination from '$lib/components/actions/SendDestination.svelte';

	const send = async () => {
		busy.start();

		try {
			// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
			const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData();

			// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
			// exceeds block gas limit
			if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				throw new Error('Cannot get max gas fee');
			}

			const nonce = await getTransactionCount($addressStore!);

			const transaction = {
				to: '0xb68e27A58133c90c6d60c5374D801B9F95e76419',
				value: Utils.parseEther('0.0001').toBigInt(),
				chain_id: CHAIN_ID,
				nonce: BigInt(nonce),
				gas: ETH_BASE_FEE,
				max_fee_per_gas: maxFeePerGas.toBigInt(),
				max_priority_fee_per_gas: maxPriorityFeePerGas.toBigInt()
			} as const;

			console.log(transaction);

			const rawTransaction = await signTransaction(transaction);

			console.log(rawTransaction);

			const sentTransaction = await sendTransaction(rawTransaction);

			console.log('Success', sentTransaction);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});
		}

		busy.stop();
	};

	let disabled: boolean;
	$: disabled = $addressStoreNotLoaded || $balanceStoreEmpty || $isBusy;

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

	let disableNext = true;
	$: disableNext = isNullish(destination) || destination === '' || isNullish(amount) || amount <= 0;

	const close = () => {
		visible = false;

		destination = '';
		amount = undefined;
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
			<SendDestination {destination} {amount} />

			<SendSource />

			<div class="flex justify-end gap-1">
				<button class="primary" on:click={modal.back}>Back</button>
				<button class="primary" on:click={modal.next}> Send </button>
			</div>
		{:else}
			<label for="destination" class="font-bold px-1.25">Destination:</label>
			<Input
				name="destination"
				inputType="text"
				required
				bind:value={destination}
				placeholder="Enter public address (0x)"
			/>

			<label for="amount" class="font-bold px-1.25">Amount:</label>
			<Input name="amount" inputType="icp" required bind:value={amount} placeholder="Amount" />

			<SendSource />

			<div class="flex justify-end gap-1">
				<button class="primary" on:click={close}>Cancel</button>
				<button
					class="primary"
					on:click={modal.next}
					disabled={disableNext}
					class:opacity-15={disableNext}
				>
					Next
				</button>
			</div>
		{/if}
	</WizardModal>
{/if}

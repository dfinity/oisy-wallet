<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$eth/types/wallet-connect';
	import FeeContext from '../fee/FeeContext.svelte';
	import { setContext } from 'svelte';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '../../stores/fee.store';
	import { address } from '$lib/derived/address.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectSendReview from './WalletConnectSendReview.svelte';
	import { SendStep } from '$lib/enums/steps';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { token } from '$lib/derived/token.derived';
	import { WALLET_CONNECT_SEND_STEPS } from '$lib/constants/steps.constants';
	import {
		send as sendServices,
		reject as rejectServices
	} from '../../services/wallet-connect.services';
	import WalletConnectModalTitle from './WalletConnectModalTitle.svelte';
	import { isErc20TransactionApprove } from '$eth/utils/transactions.utils';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;

	let erc20Approve = false;
	$: erc20Approve = isErc20TransactionApprove(firstTransaction.data);

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
		const { success } = await sendServices({
			request,
			listener,
			address: $address,
			amount,
			fee: $storeFeeData,
			modalNext: modal.next,
			token: $token,
			progress: (step: SendStep) => (sendProgressStep = step)
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	{@const destination = firstTransaction.to ?? ''}
	{@const data = firstTransaction.data}

	<WalletConnectModalTitle slot="title">{erc20Approve ? 'Approve' : 'Send'}</WalletConnectModalTitle
	>

	<FeeContext amount={amount.toString()} {destination} observe={currentStep?.name !== 'Sending'}>
		{#if currentStep?.name === 'Sending'}
			<SendProgress progressStep={sendProgressStep} steps={WALLET_CONNECT_SEND_STEPS} />
		{:else}
			<WalletConnectSendReview
				{amount}
				{destination}
				{data}
				{erc20Approve}
				on:icApprove={send}
				on:icReject={reject}
			/>
		{/if}
	</FeeContext>
</WizardModal>

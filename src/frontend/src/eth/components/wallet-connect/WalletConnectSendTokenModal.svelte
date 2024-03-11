<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import type {
		WalletConnectEthSendTransactionParams,
		WalletConnectListener
	} from '$eth/types/wallet-connect';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import { getContext, setContext } from 'svelte';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { address } from '$lib/derived/address.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectSendReview from './WalletConnectSendReview.svelte';
	import { SendStep } from '$lib/enums/steps';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { WALLET_CONNECT_SEND_STEPS } from '$eth/constants/steps.constants';
	import {
		send as sendServices,
		reject as rejectServices
	} from '$eth/services/wallet-connect.services';
	import WalletConnectModalTitle from './WalletConnectModalTitle.svelte';
	import { isErc20TransactionApprove } from '$eth/utils/transactions.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import type { Network } from '$lib/types/network';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { ICP_NETWORK } from '$icp-eth/constants/networks.constants';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { selectedChainId } from '$eth/derived/network.derived';

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
	 * Send context store
	 */

	const { sendTokenId, sendToken, sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Network
	 */

	let destination = '';
	$: destination = firstTransaction.to ?? '';

	let network: Network | undefined = undefined;
	$: network =
		destination === $ckEthHelperContractAddressStore?.[$sendTokenId]?.data
			? ICP_NETWORK
			: $selectedNetwork;

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
			token: $sendToken,
			progress: (step: SendStep) => (sendProgressStep = step),
			identity: $authStore.identity,
			ckEthHelperContractAddress: $ckEthHelperContractAddressStore?.[$sendTokenId],
			tokenStandard: $sendTokenStandard,
			network: $selectedNetwork,
			targetNetwork: network,
			chainId: $selectedChainId
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	{@const data = firstTransaction.data}

	<WalletConnectModalTitle slot="title">{erc20Approve ? 'Approve' : 'Send'}</WalletConnectModalTitle
	>

	<FeeContext amount={amount.toString()} {destination} observe={currentStep?.name !== 'Sending'}>
		<CkEthLoader>
			{#if currentStep?.name === 'Sending'}
				<SendProgress progressStep={sendProgressStep} steps={WALLET_CONNECT_SEND_STEPS} />
			{:else}
				<WalletConnectSendReview
					{amount}
					{destination}
					{data}
					{erc20Approve}
					{network}
					on:icApprove={send}
					on:icReject={reject}
				/>
			{/if}
		</CkEthLoader>
	</FeeContext>
</WizardModal>

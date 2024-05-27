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
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import { address } from '$lib/derived/address.derived';
	import { BigNumber } from '@ethersproject/bignumber';
	import WalletConnectSendReview from './WalletConnectSendReview.svelte';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { walletConnectSendSteps } from '$eth/constants/steps.constants';
	import {
		send as sendServices,
		reject as rejectServices
	} from '$eth/services/wallet-connect.services';
	import WalletConnectModalTitle from './WalletConnectModalTitle.svelte';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import type { Network } from '$lib/types/network';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import { ICP_NETWORK } from '$env/networks.env';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import type { EthereumNetwork } from '$eth/types/network';
	import { writable } from 'svelte/store';
	import { i18n } from '$lib/stores/i18n.store';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { isErc20TransactionApprove } from '$eth/utils/transactions.utils';

	export let request: Web3WalletTypes.SessionRequest;
	export let firstTransaction: WalletConnectEthSendTransactionParams;
	export let sourceNetwork: EthereumNetwork;

	let erc20Approve = false;
	$: erc20Approve = isErc20TransactionApprove(firstTransaction.data);

	/**
	 * Send context store
	 */

	const { sendTokenId, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Fee context store
	 */

	let feeStore = initFeeStore();

	let feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($sendToken.symbol);

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore
		})
	);

	/**
	 * Network
	 */

	let destination = '';
	$: destination = firstTransaction.to ?? '';

	let targetNetwork: Network | undefined = undefined;
	$: targetNetwork =
		destination ===
		toCkEthHelperContractAddress($ckEthMinterInfoStore?.[$sendTokenId], sourceNetwork.id)
			? ICP_NETWORK
			: $selectedNetwork;

	let sendWithApproval: boolean;
	$: sendWithApproval = shouldSendWithApproval({
		to: destination,
		tokenId: $sendTokenId,
		erc20HelperContractAddress: $ckErc20HelperContractAddress
	});

	/**
	 * Modal
	 */

	const steps: WizardSteps = [
		{
			name: 'Review',
			title: $i18n.send.text.review
		},
		{
			name: 'Sending',
			title: $i18n.send.text.sending
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

	let sendProgressStep: string = ProgressStepsSend.INITIALIZATION;

	let amount: BigNumber;
	$: amount = BigNumber.from(firstTransaction?.value ?? '0');

	const send = async () => {
		const { success } = await sendServices({
			request,
			listener,
			address: $address,
			amount,
			fee: $feeStore,
			modalNext: modal.next,
			token: $sendToken,
			progress: (step: ProgressStepsSend) => (sendProgressStep = step),
			identity: $authStore.identity,
			minterInfo: $ckEthMinterInfoStore?.[$ethereumTokenId],
			sourceNetwork,
			targetNetwork
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	{@const data = firstTransaction.data}

	<WalletConnectModalTitle slot="title"
		>{erc20Approve
			? $i18n.wallet_connect.text.approve
			: $i18n.send.text.send}</WalletConnectModalTitle
	>

	<FeeContext
		amount={amount.toString()}
		{destination}
		observe={currentStep?.name !== 'Sending'}
		{sourceNetwork}
		nativeEthereumToken={$ethereumToken}
	>
		<CkEthLoader nativeTokenId={$sendTokenId}>
			{#if currentStep?.name === 'Sending'}
				<SendProgress
					progressStep={sendProgressStep}
					steps={walletConnectSendSteps({ i18n: $i18n, sendWithApproval })}
				/>
			{:else}
				<WalletConnectSendReview
					{amount}
					{destination}
					{data}
					{erc20Approve}
					{sourceNetwork}
					{targetNetwork}
					on:icApprove={send}
					on:icReject={reject}
				/>
			{/if}
		</CkEthLoader>
	</FeeContext>
</WizardModal>

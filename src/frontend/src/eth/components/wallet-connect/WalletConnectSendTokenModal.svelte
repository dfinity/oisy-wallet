<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.env';
	import FeeContext from '$eth/components/fee/FeeContext.svelte';
	import WalletConnectModalTitle from '$eth/components/wallet-connect/WalletConnectModalTitle.svelte';
	import WalletConnectSendReview from '$eth/components/wallet-connect/WalletConnectSendReview.svelte';
	import { walletConnectSendSteps } from '$eth/constants/steps.constants';
	import { ethereumToken, ethereumTokenId } from '$eth/derived/token.derived';
	import {
		send as sendServices,
		reject as rejectServices
	} from '$eth/services/wallet-connect.services';
	import {
		FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$eth/stores/fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type {
		OptionWalletConnectListener,
		WalletConnectEthSendTransactionParams
	} from '$eth/types/wallet-connect';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { isErc20TransactionApprove } from '$eth/utils/transactions.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import type { TokenId } from '$lib/types/token';

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

	let feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set($sendToken.id);

	let feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set($sendToken.decimals);

	setContext<FeeContextType>(
		FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore
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
		toCkEthHelperContractAddress({
			minterInfo: $ckEthMinterInfoStore?.[$sendTokenId],
			networkId: sourceNetwork.id
		})
			? ICP_NETWORK
			: $sendToken.network;

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
			fee: $feeStore,
			modalNext: modal.next,
			token: $sendToken,
			progress: (step: ProgressStepsSend) => (sendProgressStep = step),
			identity: $authIdentity,
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
		>{erc20Approve ? $i18n.core.text.approve : $i18n.send.text.send}</WalletConnectModalTitle
	>

	<FeeContext
		amount={amount.toString()}
		{destination}
		observe={currentStep?.name !== WizardStepsSend.SENDING}
		{sourceNetwork}
		nativeEthereumToken={$ethereumToken}
	>
		<CkEthLoader nativeTokenId={$sendTokenId}>
			{#if currentStep?.name === WizardStepsSend.SENDING}
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

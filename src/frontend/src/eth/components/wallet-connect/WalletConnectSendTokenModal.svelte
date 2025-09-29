<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import WalletConnectSendReview from '$eth/components/wallet-connect/WalletConnectSendReview.svelte';
	import { walletConnectSendSteps } from '$eth/constants/steps.constants';
	import {
		nativeEthereumTokenWithFallback,
		nativeEthereumTokenId
	} from '$eth/derived/token.derived';
	import { send as sendServices } from '$eth/services/wallet-connect.services';
	import {
		ETH_FEE_CONTEXT_KEY,
		type EthFeeContext as FeeContextType,
		initEthFeeContext,
		initEthFeeStore
	} from '$eth/stores/eth-fee.store';
	import type { EthereumNetwork } from '$eth/types/network';
	import type { ProgressStep } from '$eth/types/send';
	import type { WalletConnectEthSendTransactionParams } from '$eth/types/wallet-connect';
	import { shouldSendWithApproval } from '$eth/utils/send.utils';
	import { isErc20TransactionApprove } from '$eth/utils/transactions.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import SendProgress from '$lib/components/ui/InProgressWizard.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Network } from '$lib/types/network';
	import type { TokenId } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { formatToken } from '$lib/utils/format.utils';

	export let request: WalletKitTypes.SessionRequest;
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

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	$: feeSymbolStore.set($sendToken.symbol);

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	$: feeTokenIdStore.set($sendToken.id);

	const feeDecimalsStore = writable<number | undefined>(undefined);
	$: feeDecimalsStore.set($sendToken.decimals);

	setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
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
		destination === toCkEthHelperContractAddress($ckEthMinterInfoStore?.[$sendTokenId])
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

	const steps: WizardSteps<WizardStepsSend> = [
		{
			name: WizardStepsSend.REVIEW,
			title: $i18n.send.text.review
		},
		{
			name: WizardStepsSend.SENDING,
			title: $i18n.send.text.sending
		}
	];

	let currentStep: WizardStep<WizardStepsSend> | undefined;
	let modal: WizardModal<WizardStepsSend>;

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

	let amount: bigint;
	$: amount = BigInt(firstTransaction?.value ?? ZERO);

	const send = async () => {
		const { success } = await sendServices({
			request,
			listener,
			address: $ethAddress,
			amount,
			fee: $feeStore,
			modalNext: modal.next,
			token: $sendToken,
			progress: (step: ProgressStep) => (sendProgressStep = step),
			identity: $authIdentity,
			minterInfo: $ckEthMinterInfoStore?.[$nativeEthereumTokenId],
			sourceNetwork,
			targetNetwork
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{@const { data } = firstTransaction}

	{#snippet title()}
		<WalletConnectModalTitle
			>{erc20Approve ? $i18n.core.text.approve : $i18n.send.text.send}</WalletConnectModalTitle
		>
	{/snippet}

	<EthFeeContext
		amount={formatToken({ value: amount, unitName: $sendToken.decimals })}
		{data}
		{destination}
		nativeEthereumToken={$nativeEthereumTokenWithFallback}
		observe={currentStep?.name !== WizardStepsSend.SENDING}
		sendToken={$sendToken}
		sendTokenId={$sendTokenId}
		{sourceNetwork}
	>
		<CkEthLoader nativeTokenId={$sendTokenId}>
			{#if currentStep?.name === WizardStepsSend.SENDING}
				<SendProgress
					progressStep={sendProgressStep}
					steps={walletConnectSendSteps({ i18n: $i18n, sendWithApproval })}
				/>
			{:else if currentStep?.name === WizardStepsSend.REVIEW}
				<WalletConnectSendReview
					{amount}
					{data}
					{destination}
					{erc20Approve}
					onApprove={send}
					onReject={reject}
					{sourceNetwork}
					{targetNetwork}
				/>
			{/if}
		</CkEthLoader>
	</EthFeeContext>
</WizardModal>

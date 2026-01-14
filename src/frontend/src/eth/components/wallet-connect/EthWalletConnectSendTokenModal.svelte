<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { ICP_NETWORK } from '$env/networks/networks.icp.env';
	import EthFeeContext from '$eth/components/fee/EthFeeContext.svelte';
	import EthWalletConnectSendReview from '$eth/components/wallet-connect/EthWalletConnectSendReview.svelte';
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
	import type { TokenId } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		firstTransaction: WalletConnectEthSendTransactionParams;
		sourceNetwork: EthereumNetwork;
		listener: OptionWalletConnectListener;
	}

	let { request, firstTransaction, sourceNetwork, listener }: Props = $props();

	let erc20Approve = $derived(isErc20TransactionApprove(firstTransaction.data));

	/**
	 * Send context store
	 */

	const { sendTokenId, sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Fee context store
	 */

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set($sendToken.symbol);
		feeTokenIdStore.set($sendToken.id);
		feeDecimalsStore.set($sendToken.decimals);
	});

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

	let destination = $derived(firstTransaction.to ?? '');

	let targetNetwork = $derived(
		destination === toCkEthHelperContractAddress($ckEthMinterInfoStore?.[$sendTokenId])
			? ICP_NETWORK
			: $sendToken.network
	);

	let sendWithApproval = $derived(
		shouldSendWithApproval({
			to: destination,
			tokenId: $sendTokenId,
			erc20HelperContractAddress: $ckErc20HelperContractAddress
		})
	);

	let application = $derived(request.verifyContext.verified.origin);

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

	let currentStep = $state<WizardStep<WizardStepsSend> | undefined>();
	let modal = $state<WizardModal<WizardStepsSend>>();

	const close = () => modalStore.close();

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

	let sendProgressStep = $state<ProgressStep>(ProgressStepsSend.INITIALIZATION);

	let amount = $derived(BigInt(firstTransaction?.value ?? ZERO));

	const send = async () => {
		if (isNullish(modal)) {
			return;
		}

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
			{#key currentStep?.name}
				{#if currentStep?.name === WizardStepsSend.SENDING}
					<SendProgress
						progressStep={sendProgressStep}
						steps={walletConnectSendSteps({ i18n: $i18n, sendWithApproval })}
					/>
				{:else if currentStep?.name === WizardStepsSend.REVIEW}
					<EthWalletConnectSendReview
						{amount}
						{application}
						{data}
						{destination}
						{erc20Approve}
						onApprove={send}
						onReject={reject}
						{sourceNetwork}
						{targetNetwork}
					/>
				{/if}
			{/key}
		</CkEthLoader>
	</EthFeeContext>
</WizardModal>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { getContext, onDestroy, setContext, untrack } from 'svelte';
	import { get, writable } from 'svelte/store';
	import { goto } from '$app/navigation';
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
	import {
		classifyWalletConnectEthCall,
		getSendParamsGas,
		isWalletConnectEthApproval,
		walletConnectEthRefusals
	} from '$eth/utils/wallet-connect.utils';
	import CkEthLoader from '$icp-eth/components/core/CkEthLoader.svelte';
	import { ckErc20HelperContractAddress } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import { toCkEthHelperContractAddress } from '$icp-eth/utils/cketh.utils';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSend } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { userSelectedNetworkStore } from '$lib/stores/user-selected-network.store';
	import { walletConnectUncheckedSigningStore } from '$lib/stores/wallet-connect-unchecked-signing.store';
	import type { TokenId } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { formatToken } from '$lib/utils/format.utils';
	import { networkUrl } from '$lib/utils/nav.utils';
	import {
		isWalletConnectDomainFlagged,
		isWalletConnectUncheckedSigningActive
	} from '$lib/utils/wallet-connect.utils';

	interface Props {
		request: WalletKitTypes.SessionRequest;
		firstTransaction: WalletConnectEthSendTransactionParams;
		sourceNetwork: EthereumNetwork;
		listener: OptionWalletConnectListener;
	}

	let { request, firstTransaction, sourceNetwork, listener }: Props = $props();

	let call = $derived(classifyWalletConnectEthCall(firstTransaction.data));

	// An approval authorizes someone else to move the user's tokens. It is not a send, whatever
	// native value the request carries alongside it.
	let approve = $derived(isWalletConnectEthApproval(call));

	// Only a request that carries no calldata is titled a send. A contract call OISY could not read
	// might do anything, and titling it "Send" is the misstatement that let an `increaseAllowance`
	// granting an unlimited allowance be presented as a zero-value transfer.
	let unknownCall = $derived(call.type === 'unknown');

	// What the Settings switch can sign past, read the way the review and the signing service read
	// it, so the acknowledgement handed on names exactly what the review showed.
	let refusals = $derived(walletConnectEthRefusals({ call, data: firstTransaction.data }));

	// WalletConnect's domain verification flagged the site: no way past a refusal is offered, and the
	// review does not point at the switch either.
	let domainFlagged = $derived(isWalletConnectDomainFlagged(request.verifyContext));

	// Read once, when the review opens: one that opened while the Settings switch was on keeps the
	// offer until it closes, and one that opened after it turned off never gains it.
	const uncheckedSigningOn = isWalletConnectUncheckedSigningActive({
		expiresAt: get(walletConnectUncheckedSigningStore),
		now: Date.now()
	});

	let uncheckedSigningOffered = $derived(uncheckedSigningOn && !domainFlagged);

	let uncheckedSigningAcknowledged = $state(false);

	// A tick agrees to the refusals the review showed when it was given, and starts over should they
	// change.
	let refusalsKey = $derived(refusals.join());

	$effect(() => {
		[refusalsKey];

		untrack(() => (uncheckedSigningAcknowledged = false));
	});

	/**
	 * Send context store
	 */

	const { sendTokenId, sendToken, sendEthFeePriority } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Fee context store
	 */

	const feeStore = initEthFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set($sendToken.symbol);
		feeTokenIdStore.set($sendToken.id);
		feeDecimalsStore.set($sendToken.decimals);
		feeExchangeRateStore.set($exchanges?.[$sendToken.id]?.usd);
	});

	setContext<FeeContextType>(
		ETH_FEE_CONTEXT_KEY,
		initEthFeeContext({
			feeStore,
			feeSymbolStore,
			feeTokenIdStore,
			feeDecimalsStore,
			feeExchangeRateStore
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

	let closeTimeout: NodeJS.Timeout | undefined;

	/**
	 * Reject a transaction
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	// Leaving the review rejects the request, as closing it does: the user turns the switch on and the
	// app sends the request again.
	const openSettings = async () => {
		await reject();

		await goto(
			networkUrl({
				path: AppPath.Settings,
				networkId: $userSelectedNetworkStore,
				usePreviousRoute: false,
				fromRoute: null
			})
		);
	};

	/**
	 * Send and approve
	 */

	let sendProgressStep = $state<ProgressStep>(ProgressStepsSend.INITIALIZATION);

	let amount = $derived(BigInt(firstTransaction?.value ?? ZERO));

	let requestedGas = $derived(getSendParamsGas(firstTransaction.gas));

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
			targetNetwork,
			acknowledgedRefusals: uncheckedSigningOffered && uncheckedSigningAcknowledged ? refusals : []
		});

		closeTimeout = setTimeout(() => close(), success ? 750 : 0);
	};

	onDestroy(() => clearTimeout(closeTimeout));
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{@const { data } = firstTransaction}

	{#snippet title()}
		<WalletConnectModalTitle>
			{#if approve}
				{$i18n.core.text.approve}
			{:else if unknownCall}
				{$i18n.wallet_connect.text.unknown_call_title}
			{:else}
				{$i18n.send.text.send}
			{/if}
		</WalletConnectModalTitle>
	{/snippet}

	<EthFeeContext
		amount={formatToken({ value: amount, unitName: $sendToken.decimals })}
		{data}
		{destination}
		nativeEthereumToken={$nativeEthereumTokenWithFallback}
		observe={currentStep?.name !== WizardStepsSend.SENDING}
		priority={$sendEthFeePriority}
		sendToken={$sendToken}
		sendTokenId={$sendTokenId}
		{sourceNetwork}
	>
		<CkEthLoader nativeTokenId={$sendTokenId}>
			{#key currentStep?.name}
				{#if currentStep?.name === WizardStepsSend.SENDING}
					<InProgressWizard
						progressStep={sendProgressStep}
						steps={walletConnectSendSteps({ i18n: $i18n, sendWithApproval })}
					/>
				{:else if currentStep?.name === WizardStepsSend.REVIEW}
					<EthWalletConnectSendReview
						{amount}
						{application}
						approveDisabled={isNullish($feeStore)}
						{call}
						{data}
						{destination}
						{domainFlagged}
						onApprove={send}
						onOpenSettings={openSettings}
						onReject={reject}
						onUncheckedSigningAcknowledge={() =>
							(uncheckedSigningAcknowledged = !uncheckedSigningAcknowledged)}
						{requestedGas}
						{sourceNetwork}
						{targetNetwork}
						{uncheckedSigningAcknowledged}
						{uncheckedSigningOffered}
					/>
				{/if}
			{/key}
		</CkEthLoader>
	</EthFeeContext>
</WizardModal>

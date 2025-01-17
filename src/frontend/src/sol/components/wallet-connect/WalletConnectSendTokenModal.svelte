<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { assertNonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';
	import { getContext } from 'svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet,
		solAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionSolAddress, SolAddress } from '$lib/types/address';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import {
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal,
		isNetworkIdSOLTestnet
	} from '$lib/utils/network.utils';
	import SolSendProgress from '$sol/components/send/SolSendProgress.svelte';
	import WalletConnectSendReview from '$sol/components/wallet-connect/WalletConnectSendReview.svelte';
	import {
		sign as signService,
		decode as decodeService
	} from '$sol/services/wallet-connect.services';
	import type { SolanaNetwork } from '$sol/types/network';

	export let request: Web3WalletTypes.SessionRequest;
	export let network: SolanaNetwork;

	/**
	 * Send context store
	 */

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Transaction
	 */

	let networkId: NetworkId;
	$: ({ id: networkId } = network);

	let address: OptionSolAddress;
	$: address = isNetworkIdSOLTestnet(networkId)
		? $solAddressTestnet
		: isNetworkIdSOLDevnet(networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal(networkId)
				? $solAddressLocal
				: $solAddressMainnet;

	let data: string;
	let amount: bigint | undefined;
	let destination: OptionSolAddress;

	$: (async () => {
		data = request.params.request.params.transaction;

		// This should not happen since we arrive here only if there is a transaction message
		assertNonNullish(data);

		( {amount,destination} = await decodeService({ base64EncodedTransactionMessage: data, networkId }));
	})();

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

	let sendProgressStep: string = ProgressStepsSign.INITIALIZATION;

	const send = async () => {
		const { success } = await signService({
			request,
			listener,
			address,
			modalNext: modal.next,
			token: $sendToken,
			progress: (step: ProgressStepsSign) => (sendProgressStep = step),
			identity: $authIdentity
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal {steps} bind:currentStep bind:this={modal} on:nnsClose={reject}>
	<WalletConnectModalTitle slot="title">{$i18n.send.text.send}</WalletConnectModalTitle>

	{#if currentStep?.name === WizardStepsSend.SENDING}
		<SolSendProgress bind:sendProgressStep />
	{:else}
		<WalletConnectSendReview
			amount={BigNumber.from(amount)}
			destination={destination ?? ''}
			{data}
			{network}
			on:icApprove={send}
			on:icReject={reject}
		/>
	{/if}
</WizardModal>

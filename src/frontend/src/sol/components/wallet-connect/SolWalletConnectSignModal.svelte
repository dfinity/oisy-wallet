<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { untrack } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { type ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSign } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$sol/constants/steps.constants';
	import { SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION } from '$sol/constants/wallet-connect.constants';
	import {
		sign as signService,
		decode as decodeService
	} from '$sol/services/wallet-connect.services';
	import type { OptionSolAddress } from '$sol/types/address';
	import type { SolanaNetwork } from '$sol/types/network';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
		network: SolanaNetwork;
	}

	let { listener = $bindable(), request, network }: Props = $props();

	/**
	 * Transaction
	 */

	let { id: networkId } = $derived(network);

	let [address, token] = $derived(
		isNetworkIdSOLDevnet(networkId)
			? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
			: isNetworkIdSOLLocal(networkId)
				? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
				: [$solAddressMainnet, SOLANA_TOKEN]
	);

	let {
		params: {
			request: {
				method,
				params: { transaction: data }
			}
		},
		verifyContext: {
			verified: { origin: application }
		}
	} = $derived(request);

	let signWithSending = $derived(method === SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION);

	let amount = $state<bigint | undefined>();
	let destination = $state<OptionSolAddress>();

	const updateData = async () => {
		({ amount, destination } = await decodeService({
			base64EncodedTransactionMessage: data,
			networkId
		}));
	};

	$effect(() => {
		[data, networkId];

		untrack(() => updateData());
	});

	/**
	 * Modal
	 */

	const steps: WizardSteps<WizardStepsSign> = [
		{
			name: WizardStepsSign.REVIEW,
			title: $i18n.send.text.review
		},
		{
			name: WizardStepsSign.SIGNING,
			title: $i18n.send.text.signing
		}
	];

	let currentStep = $state<WizardStep<WizardStepsSign> | undefined>();
	let modal = $state<WizardModal<WizardStepsSign>>();

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	let signProgressStep = $state<ProgressStepsSign | ProgressStepsSendSol.SEND>(
		ProgressStepsSign.INITIALIZATION
	);

	/**
	 * Reject a transaction
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	/**
	 * Sign
	 */

	const sign = async () => {
		if (isNullish(modal)) {
			return;
		}

		const { success } = await signService({
			request,
			listener,
			address,
			modalNext: modal.next,
			token,
			progress: (step: ProgressStepsSign | ProgressStepsSendSol.SEND) => (signProgressStep = step),
			identity: $authIdentity
		});

		setTimeout(() => close(), success ? 750 : 0);
	};
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{#snippet title()}
		<WalletConnectModalTitle>
			{$i18n.wallet_connect.text.sign_message}
		</WalletConnectModalTitle>
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSign.SIGNING}
			<InProgressWizard
				progressStep={signProgressStep}
				steps={walletConnectSignSteps({ i18n: $i18n, signWithSending })}
			/>
		{:else if currentStep?.name === WizardStepsSign.REVIEW}
			<SolWalletConnectSignReview
				{amount}
				{application}
				{data}
				destination={destination ?? ''}
				onApprove={sign}
				onReject={reject}
				source={address ?? ''}
				{token}
			/>
		{/if}
	{/key}
</WizardModal>

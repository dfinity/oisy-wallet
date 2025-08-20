<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onMount } from 'svelte';
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
	import type { OptionSolAddress } from '$lib/types/address';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$sol/constants/steps.constants';
	import { SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION } from '$sol/constants/wallet-connect.constants';
	import {
		sign as signService,
		decode as decodeService
	} from '$sol/services/wallet-connect.services';
	import type { SolanaNetwork } from '$sol/types/network';

	export let listener: OptionWalletConnectListener;
	export let request: WalletKitTypes.SessionRequest;
	export let network: SolanaNetwork;

	/**
	 * Transaction
	 */

	let networkId: NetworkId;
	$: ({ id: networkId } = network);

	let address: OptionSolAddress;
	let token: Token;
	$: [address, token] = isNetworkIdSOLDevnet(networkId)
		? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
		: isNetworkIdSOLLocal(networkId)
			? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
			: [$solAddressMainnet, SOLANA_TOKEN];

	let signWithSending = false;
	let data: string;
	let amount: bigint | undefined;
	let destination: OptionSolAddress;

	onMount(async () => {
		const {
			params: {
				request: {
					method,
					params: { transaction }
				}
			}
		} = request;

		signWithSending = method === SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION;
		data = transaction;

		({ amount, destination } = await decodeService({
			base64EncodedTransactionMessage: data,
			networkId
		}));
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

	let currentStep: WizardStep<WizardStepsSign> | undefined;
	let modal: WizardModal<WizardStepsSign>;

	const close = () => modalStore.close();

	/**
	 * WalletConnect
	 */

	let signProgressStep: string = ProgressStepsSign.INITIALIZATION;

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

	{#if currentStep?.name === WizardStepsSign.SIGNING}
		<InProgressWizard
			progressStep={signProgressStep}
			steps={walletConnectSignSteps({ i18n: $i18n, signWithSending })}
		/>
	{:else}
		<SolWalletConnectSignReview
			{amount}
			{data}
			destination={destination ?? ''}
			onApprove={sign}
			onReject={reject}
			{token}
		/>
	{/if}
</WizardModal>

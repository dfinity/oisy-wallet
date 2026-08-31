<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy, untrack } from 'svelte';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
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
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { consoleError } from '$lib/utils/console.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import SolWalletConnectSignReview from '$sol/components/wallet-connect/SolWalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$sol/constants/steps.constants';
	import { SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION } from '$sol/constants/wallet-connect.constants';
	import { enabledSplTokens } from '$sol/derived/spl.derived';
	import {
		sign as signService,
		decode as decodeService
	} from '$sol/services/wallet-connect.services';
	import type { OptionSolAddress } from '$sol/types/address';
	import type { SolanaNetwork } from '$sol/types/network';
	import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
	import type { SolSimulationPreview } from '$sol/types/sol-simulation';
	import type { SolTransferParties } from '$sol/types/sol-transaction';
	import type { SolTransactionSummary } from '$sol/types/sol-transaction-summary';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
		network: SolanaNetwork;
	}

	let { listener, request, network }: Props = $props();

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
	let tokenAddress = $state<OptionSolAddress>();
	let isApproval = $state<boolean | undefined>();
	let unreviewed = $state<boolean | undefined>();
	let prioritizationFee = $state<bigint | undefined>();
	let prioritizationFeeEstimate = $state<bigint | undefined>();
	let preview = $state<SolSimulationPreview | undefined>();
	let instructions = $state<SolInstructionSummary[] | undefined>();
	let messageSummary = $state<SolTransactionSummary | undefined>();
	let parties = $state<SolTransferParties | undefined>();
	// The decode is asynchronous, so until it settles the review shows an empty summary and no
	// warning. Approval waits for it: signing on the strength of a review that has not been
	// computed yet is exactly what the warnings exist to prevent. A failed decode never flips it,
	// which leaves rejecting as the only way out.
	let decoded = $state(false);

	const updateData = async () => {
		try {
			({
				amount,
				destination,
				tokenAddress,
				isApproval,
				unreviewed,
				prioritizationFee,
				prioritizationFeeEstimate,
				preview,
				instructions,
				messageSummary,
				parties
			} = await decodeService({
				base64EncodedTransactionMessage: data,
				networkId,
				address
			}));

			decoded = true;
		} catch (err: unknown) {
			// The effect cannot await this, so a rejection would go unhandled. Leaving `decoded`
			// false is the outcome we want anyway: a review that could not be computed stays
			// unapprovable, and rejecting is the only way out.
			consoleError(err);
		}
	};

	// When the transaction moves an SPL token we know, review it with that token's
	// metadata; otherwise fall back to the network's native SOL token. The same mint
	// can exist on several clusters, so we match the current network too.
	let reviewToken = $derived(
		nonNullish(tokenAddress)
			? ($enabledSplTokens.find(
					({ address, network: { id } }) => address === tokenAddress && id === networkId
				) ?? token)
			: token
	);

	$effect(() => {
		[data, networkId, address];

		untrack(() => {
			decoded = false;

			updateData();
		});
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

	let closeTimeout: NodeJS.Timeout | undefined;

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

		closeTimeout = setTimeout(() => close(), success ? 750 : 0);
	};

	onDestroy(() => clearTimeout(closeTimeout));
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{#snippet title()}
		<WalletConnectModalTitle>
			{signWithSending
				? $i18n.wallet_connect.text.sign_and_send_transaction
				: $i18n.wallet_connect.text.sign_transaction}
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
				approveDisabled={!decoded}
				{data}
				destination={destination ?? ''}
				feeToken={token}
				{instructions}
				isApproval={isApproval ?? false}
				{messageSummary}
				onApprove={sign}
				onReject={reject}
				{parties}
				{preview}
				{prioritizationFee}
				{prioritizationFeeEstimate}
				source={address ?? ''}
				token={reviewToken}
				unreviewed={unreviewed ?? false}
			/>
		{/if}
	{/key}
</WizardModal>

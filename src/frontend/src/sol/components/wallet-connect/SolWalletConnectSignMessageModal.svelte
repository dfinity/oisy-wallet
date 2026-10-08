<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy } from 'svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSign } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import SolWalletConnectSignMessageReview from '$sol/components/wallet-connect/SolWalletConnectSignMessageReview.svelte';
	import { walletConnectSignSteps } from '$sol/constants/steps.constants';
	import {
		decodeMessage,
		signMessage as signMessageService
	} from '$sol/services/wallet-connect.services';
	import type { SolanaNetwork } from '$sol/types/network';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
		network: SolanaNetwork;
	}

	let { listener, request, network }: Props = $props();

	let { id: networkId } = $derived(network);

	let address = $derived(
		isNetworkIdSOLDevnet(networkId)
			? $solAddressDevnet
			: isNetworkIdSOLLocal(networkId)
				? $solAddressLocal
				: $solAddressMainnet
	);

	let method = $derived(request.params.request.method);
	let application = $derived(request.verifyContext.verified.origin);
	let message = $derived(decodeMessage(request));

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

	let signProgressStep = $state<ProgressStepsSign>(ProgressStepsSign.INITIALIZATION);

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	const approve = async () => {
		if (isNullish(modal)) {
			return;
		}

		const { success } = await signMessageService({
			request,
			listener,
			address,
			networkId,
			modalNext: modal.next,
			progress: (step: ProgressStepsSign) => (signProgressStep = step),
			identity: $authIdentity
		});

		closeTimeout = setTimeout(() => close(), success ? 750 : 0);
	};

	onDestroy(() => clearTimeout(closeTimeout));
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
				steps={walletConnectSignSteps({ i18n: $i18n, signWithSending: false })}
			/>
		{:else if currentStep?.name === WizardStepsSign.REVIEW}
			<SolWalletConnectSignMessageReview
				{application}
				{message}
				{method}
				onApprove={approve}
				onReject={reject}
				source={address ?? ''}
			/>
		{/if}
	{/key}
</WizardModal>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy } from 'svelte';
	import BtcWalletConnectSignReview from '$btc/components/wallet-connect/BtcWalletConnectSignReview.svelte';
	import { decodeMessage, sign as signService } from '$btc/services/wallet-connect.services';
	import type { OptionBtcAddress } from '$btc/types/address';
	import { walletConnectSignSteps } from '$eth/constants/steps.constants';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSign } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
		address: OptionBtcAddress;
	}

	let { listener, request, address }: Props = $props();

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

		const { success } = await signService({
			request,
			listener,
			address,
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
			<InProgressWizard progressStep={signProgressStep} steps={walletConnectSignSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSign.REVIEW}
			<BtcWalletConnectSignReview
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

<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy } from 'svelte';
	import WalletConnectSignReview from '$eth/components/wallet-connect/WalletConnectSignReview.svelte';
	import { walletConnectSignSteps } from '$eth/constants/steps.constants';
	import { signMessage } from '$eth/services/wallet-connect.services';
	import {
		getSignParamsMessageTypedDataV4,
		isEthSignTypedDataMethod
	} from '$eth/utils/wallet-connect.utils';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import WizardModal from '$lib/components/ui/WizardModal.svelte';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import { ProgressStepsSign } from '$lib/enums/progress-steps';
	import { WizardStepsSign } from '$lib/enums/wizard-steps';
	import { reject as rejectServices } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
	}

	let { listener, request }: Props = $props();

	let method = $derived(request.params.request.method);

	// The struct being hashed, which is what the request actually asks for. Parsing can fail on a
	// malformed payload, and a title is no reason to throw: such a request is titled by its method
	// alone and left to the review, which is where an unparseable payload is reported.
	let primaryType = $derived.by(() => {
		if (!isEthSignTypedDataMethod(method)) {
			return;
		}

		try {
			const { primaryType } = getSignParamsMessageTypedDataV4(request.params.request.params);

			return notEmptyString(primaryType) ? primaryType : undefined;
		} catch (_: unknown) {
			return undefined;
		}
	});

	// Typed data is a transaction the user authorizes rather than a message they write, so it is
	// titled as one, named by its struct where the request declares a usable one. A raw message
	// stays a message. Either way the title says what OISY makes of the request, never what the
	// request calls itself: the domain name it supplies is stated in the summary instead.
	let modalTitle = $derived(
		isEthSignTypedDataMethod(method)
			? nonNullish(primaryType)
				? replacePlaceholders($i18n.wallet_connect.text.sign_transaction_with_type, {
						$type: primaryType
					})
				: $i18n.wallet_connect.text.sign_transaction
			: $i18n.wallet_connect.text.sign_message
	);

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

	let signProgressStep = $state<ProgressStepsSign>(ProgressStepsSign.INITIALIZATION);

	/**
	 * Reject a message
	 */

	const reject = async () => {
		await rejectServices({ listener, request });

		close();
	};

	const approve = async () => {
		if (isNullish(modal)) {
			return;
		}

		const { success } = await signMessage({
			request,
			listener,
			modalNext: modal.next,
			progress: (step: ProgressStepsSign) => (signProgressStep = step)
		});

		closeTimeout = setTimeout(() => close(), success ? 750 : 0);
	};

	onDestroy(() => clearTimeout(closeTimeout));
</script>

<WizardModal bind:this={modal} onClose={reject} {steps} bind:currentStep>
	{#snippet title()}
		<WalletConnectModalTitle>
			{modalTitle}
		</WalletConnectModalTitle>
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSign.SIGNING}
			<InProgressWizard progressStep={signProgressStep} steps={walletConnectSignSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSign.REVIEW}
			<WalletConnectSignReview onApprove={approve} onReject={reject} {request} />
		{/if}
	{/key}
</WizardModal>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import { onDestroy } from 'svelte';
	import BtcWalletConnectSignPsbtReview from '$btc/components/wallet-connect/BtcWalletConnectSignPsbtReview.svelte';
	import { decodePsbt, signPsbt as signPsbtService } from '$btc/services/wallet-connect.services';
	import type { OptionBtcAddress } from '$btc/types/address';
	import type { WalletConnectBtcDecodedPsbt } from '$btc/types/wallet-connect';
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
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';
	import type { WizardStep, WizardSteps } from '$lib/types/wizard';

	interface Props {
		listener: OptionWalletConnectListener;
		request: WalletKitTypes.SessionRequest;
		address: OptionBtcAddress;
	}

	let { listener, request, address }: Props = $props();

	let application = $derived(request.verifyContext.verified.origin);

	let decoded = $state<WalletConnectBtcDecodedPsbt | undefined>();
	let decodeError = $state(false);

	$effect(() => {
		try {
			decoded = decodePsbt({ request, address });
			decodeError = false;
		} catch (_: unknown) {
			decoded = undefined;
			decodeError = true;
		}
	});

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

		if (isNullish(decoded)) {
			toastsError({ msg: { text: $i18n.wallet_connect.error.unknown_parameter } });
			await reject();
			return;
		}

		const { success } = await signPsbtService({
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
			{$i18n.wallet_connect.text.sign_psbt}
		</WalletConnectModalTitle>
	{/snippet}

	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSign.SIGNING}
			<InProgressWizard progressStep={signProgressStep} steps={walletConnectSignSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSign.REVIEW}
			<BtcWalletConnectSignPsbtReview
				{application}
				{decodeError}
				{decoded}
				onApprove={approve}
				onReject={reject}
				source={address ?? ''}
			/>
		{/if}
	{/key}
</WizardModal>

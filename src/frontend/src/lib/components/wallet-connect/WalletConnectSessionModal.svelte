<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import WalletConnectSessionWizard from '$lib/components/wallet-connect/WalletConnectSessionWizard.svelte';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { connectListener, resetListener } from '$lib/services/wallet-connect.services';
	import { resetListener } from '$lib/services/wallet-connect.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { walletConnectProposalStore } from '$lib/stores/wallet-connect.store';
	import { closeModal } from '$lib/utils/modal.utils';

	interface Props {
		steps: WizardSteps<WizardStepsWalletConnect>;
		modal: WizardModal<WizardStepsWalletConnect> | undefined;
	}

	let { steps, modal = $bindable() }: Props = $props();

	let proposal = $derived($walletConnectProposalStore);

	let currentStep = $state<WizardStep<WizardStepsWalletConnect> | undefined>();

	const onClose = () => {
		closeModal(resetListener);
	};

	const goToFirstStep = () => modal?.set?.(0);

	// One try to manually sign in by entering the URL manually or scanning a QR code
	const onConnect = async (uri: string) => {
		if (isNullish(modal)) {
			return;
		}

		modal.next();

		const { result } = await connectListener({ uri, onSessionDeleteCallback: goToFirstStep });

		if (result === 'error') {
			modal.back();
		}
	};
</script>

<WizardModal bind:this={modal} {onClose} {steps} bind:currentStep>
	{#snippet title()}
		<WalletConnectModalTitle>
			{`${
				currentStep?.name === WizardStepsWalletConnect.REVIEW && nonNullish(proposal)
					? $i18n.wallet_connect.text.session_proposal
					: $i18n.wallet_connect.text.name
			}`}
		</WalletConnectModalTitle>
	{/snippet}

	<WalletConnectSessionWizard {currentStep} {onConnect} />
</WizardModal>

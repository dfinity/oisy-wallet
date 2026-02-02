<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import WalletConnectSessionWizard from '$lib/components/wallet-connect/WalletConnectSessionWizard.svelte';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import {
		walletConnectListenerStore,
		walletConnectProposalStore
	} from '$lib/stores/wallet-connect.store';

	interface Props {
		steps: WizardSteps<WizardStepsWalletConnect>;
		modal: WizardModal<WizardStepsWalletConnect> | undefined;
		onConnect: (uri: string) => void;
	}

	let { steps, modal = $bindable(), onConnect }: Props = $props();

	let proposal = $derived($walletConnectProposalStore);

	let currentStep = $state<WizardStep<WizardStepsWalletConnect> | undefined>();

	const onClose = () => {
		walletConnectListenerStore.reset();

		modalStore.close();
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

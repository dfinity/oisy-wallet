<script lang="ts">
	import { WizardModal, type WizardStep, type WizardSteps } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { WalletKitTypes } from '@reown/walletkit';
	import WalletConnectModalTitle from '$lib/components/wallet-connect/WalletConnectModalTitle.svelte';
	import WalletConnectSessionWizard from '$lib/components/wallet-connect/WalletConnectSessionWizard.svelte';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Option } from '$lib/types/utils';
	import type { OptionWalletConnectListener } from '$lib/types/wallet-connect';

	interface Props {
		proposal: Option<WalletKitTypes.SessionProposal>;
		steps: WizardSteps<WizardStepsWalletConnect>;
		modal: WizardModal<WizardStepsWalletConnect> | undefined;
		onClose: () => void;
		onConnect: (uri: string) => void;
		onApprove: () => void;
		onReject: () => void;
	}

	let {
		proposal,
		steps,
		modal = $bindable(),
		onClose,
		onConnect,
		onApprove,
		onReject
	}: Props = $props();

	let currentStep = $state<WizardStep<WizardStepsWalletConnect> | undefined>();
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

	<WalletConnectSessionWizard {currentStep} {onApprove} {onConnect} {onReject} {proposal} />
</WizardModal>

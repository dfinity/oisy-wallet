<script generics="T extends WizardStepsWalletConnect | WizardStepsScanner" lang="ts">
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
	import { type WizardStepsScanner, WizardStepsWalletConnect } from '$lib/enums/wizard-steps';
	import type { WizardStep } from '$lib/types/wizard';

	interface Props {
		currentStep: WizardStep<T> | undefined;
		onConnect: (uri: string) => Promise<void>;
	}

	let { currentStep, onConnect }: Props = $props();
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsWalletConnect.REVIEW}
		<WalletConnectReview />
	{:else if currentStep?.name === WizardStepsWalletConnect.CONNECT}
		<WalletConnectForm {onConnect} />
	{/if}
{/key}

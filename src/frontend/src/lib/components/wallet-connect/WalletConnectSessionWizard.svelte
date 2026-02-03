<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import WalletConnectForm from '$lib/components/wallet-connect/WalletConnectForm.svelte';
	import WalletConnectReview from '$lib/components/wallet-connect/WalletConnectReview.svelte';
	import { WizardStepsWalletConnect } from '$lib/enums/wizard-steps';

	interface Props {
		currentStep: WizardStep<T> | undefined;
		onConnect: (uri: string) =>Promise< void>;
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

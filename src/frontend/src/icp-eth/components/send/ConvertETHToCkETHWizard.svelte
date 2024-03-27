<script lang="ts">
	import { address } from '$lib/derived/address.derived';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import type { Network } from '$lib/types/network';
	import type { WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { HOW_TO_CONVERT_WIZARD_STEPS } from '$icp-eth/constants/how-to-convert.constants';
	import { ckETHTwinTokenNetwork } from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;

	let steps: WizardSteps;
	$: steps = HOW_TO_CONVERT_WIZARD_STEPS($i18n);
</script>

<SendTokenWizard
	{currentStep}
	sourceNetwork={$ckETHTwinTokenNetwork}
	bind:destination
	bind:targetNetwork
	bind:amount
	bind:sendProgressStep
	on:icBack
	on:icNext
	on:icClose
	on:icSendBack
	formCancelAction="back"
>
	{#if currentStep?.name === steps[1].name}
		<ReceiveAddressQRCode address={$address ?? ''} on:icBack />
	{:else}
		<slot />
	{/if}
</SendTokenWizard>

<script lang="ts">
	import { address } from '$lib/derived/address.derived';
	import SendTokenWizard from '$eth/components/send/SendTokenWizard.svelte';
	import ReceiveAddressQRCode from '$icp-eth/components/receive/ReceiveAddressQRCode.svelte';
	import type { Network } from '$lib/types/network';
	import type { WizardStep } from '@dfinity/gix-components';
	import { HOW_TO_CONVERT_WIZARD_STEPS } from '$icp-eth/constants/how-to-convert.constants';
	import { ETHEREUM_NETWORK } from '$icp-eth/constants/networks.constants';

	export let destination = '';
	export let network: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;

	// TODO: chainId for ck test or mainnet
</script>

<SendTokenWizard
	{currentStep}
	chainId={ETHEREUM_NETWORK.chainId}
	bind:destination
	bind:network
	bind:amount
	bind:sendProgressStep
	on:icBack
	on:icNext
	on:icClose
	on:icSendBack
	formCancelAction="back"
>
	{#if currentStep?.name === HOW_TO_CONVERT_WIZARD_STEPS[1].name}
		<ReceiveAddressQRCode address={$address ?? ''} on:icBack />
	{:else}
		<slot />
	{/if}
</SendTokenWizard>

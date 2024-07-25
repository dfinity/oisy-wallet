<script lang="ts">
	import { address } from '$lib/derived/address.derived';
	import EthSendTokenWizard from '$eth/components/send/EthSendTokenWizard.svelte';
	import ReceiveAddressQRCode from '$lib/components/receive/ReceiveAddressQRCode.svelte';
	import type { Network } from '$lib/types/network';
	import type { WizardStep, WizardSteps } from '@dfinity/gix-components';
	import { howToConvertWizardSteps } from '$icp-eth/config/how-to-convert.config';
	import {
		ckEthereumNativeToken,
		ckEthereumTwinToken,
		ckEthereumTwinTokenNetwork
	} from '$icp-eth/derived/cketh.derived';
	import { i18n } from '$lib/stores/i18n.store';

	export let destination = '';
	export let targetNetwork: Network | undefined = undefined;
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	export let currentStep: WizardStep | undefined;

	let steps: WizardSteps;
	$: steps = howToConvertWizardSteps({ i18n: $i18n, twinToken: $ckEthereumTwinToken });
</script>

<EthSendTokenWizard
	{currentStep}
	sourceNetwork={$ckEthereumTwinTokenNetwork}
	nativeEthereumToken={$ckEthereumNativeToken}
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
</EthSendTokenWizard>

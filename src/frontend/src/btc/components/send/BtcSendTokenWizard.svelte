<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import type { WizardStep } from '@dfinity/gix-components';
	import BtcSendReview from './BtcSendReview.svelte';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import BtcSendForm from './BtcSendForm.svelte';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import { token } from '$lib/stores/token.store';
	import { icDecodeQrCode } from '$icp/utils/qr-code.utils';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import { currentBtcAddress } from '$btc/derived/current-address.derived';

	export let currentStep: WizardStep | undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;

	let source: string;
	$: source = $currentBtcAddress ?? '';

	const send = () => {
		console.log('send');
	};
</script>

{#if currentStep?.name === WizardStepsSend.REVIEW}
	<BtcSendReview on:icBack on:icSend={send} {destination} {amount} {networkId} {source} />
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<IcSendProgress bind:sendProgressStep {networkId} />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<BtcSendForm
		on:icNext
		on:icClose
		bind:destination
		bind:amount
		bind:networkId
		on:icQRCodeScan
		{source}
	/>
{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
	<SendQrCodeScan
		expectedToken={$token}
		bind:destination
		bind:amount
		decodeQrCode={icDecodeQrCode}
		on:icQRCodeBack
	/>
{:else}
	<slot />
{/if}

<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import BtcSendForm from './BtcSendForm.svelte';
	import BtcSendReview from './BtcSendReview.svelte';
	import { currentBtcAddress } from '$btc/derived/current-address.derived';
	import { sendBtcTokens } from '$btc/services/btc-send.services';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import { icDecodeQrCode } from '$icp/utils/qr-code.utils';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { token } from '$lib/stores/token.store';
	import type { NetworkId } from '$lib/types/network';

	export let currentStep: WizardStep | undefined;
	export let networkId: NetworkId | undefined = undefined;
	export let destination = '';
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;

	let source: string;
	$: source = $currentBtcAddress ?? '';

	const send = () => {
		if (
			nonNullish(destination) &&
			nonNullish(amount) &&
			nonNullish($authIdentity) &&
			nonNullish(source)
		) {
			sendBtcTokens({
				destination,
				amount,
				identity: $authIdentity,
				sourceAddress: source
			});
		}
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

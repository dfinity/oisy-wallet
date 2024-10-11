<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { createEventDispatcher, getContext } from 'svelte';
	import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
	import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
	import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
	import type { UtxosFee } from '$btc/types/btc-send';
	import { SEND_CONTEXT_KEY, type SendContext } from '$icp-eth/stores/send.store';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';
	import { decodeQrCode } from '$lib/utils/qr-code.utils';

	export let currentStep: WizardStep | undefined;
	export let destination = '';
	export let amount: number | undefined = undefined;
	export let sendProgressStep: string;
	export let formCancelAction: 'back' | 'close' = 'close';

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const progress = (step: ProgressStepsSendBtc) => (sendProgressStep = step);

	let utxosFee: UtxosFee | undefined = undefined;

	let networkId: NetworkId | undefined = undefined;
	$: networkId = $sendToken.network.id;

	let source: string;
	$: source =
		(isNetworkIdBTCTestnet(networkId)
			? $btcAddressTestnet
			: isNetworkIdBTCRegtest(networkId)
				? $btcAddressRegtest
				: $btcAddressMainnet) ?? '';

	const dispatch = createEventDispatcher();

	const close = () => dispatch('icClose');
	const back = () => dispatch('icSendBack');

	// TODO: implement send function when related services are ready
	const send = () => {};
</script>

{#if currentStep?.name === WizardStepsSend.REVIEW}
	<BtcSendReview
		on:icBack
		on:icSend={send}
		bind:utxosFee
		{progress}
		{destination}
		{amount}
		{networkId}
		{source}
	/>
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<BtcSendProgress bind:sendProgressStep />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<BtcSendForm
		on:icNext
		on:icClose
		bind:destination
		bind:amount
		on:icQRCodeScan
		{source}
		{networkId}
	>
		<svelte:fragment slot="cancel">
			{#if formCancelAction === 'back'}
				<ButtonBack on:click={back} />
			{:else}
				<ButtonCancel on:click={close} />
			{/if}
		</svelte:fragment>
	</BtcSendForm>
{:else if currentStep?.name === WizardStepsSend.QR_CODE_SCAN}
	<SendQrCodeScan
		expectedToken={$sendToken}
		bind:destination
		bind:amount
		{decodeQrCode}
		on:icQRCodeBack
	/>
{:else}
	<slot />
{/if}

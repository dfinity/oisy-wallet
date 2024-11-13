<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
	import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
	import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
	import { sendBtc } from '$btc/services/btc-send.services';
	import type { UtxosFee } from '$btc/types/btc-send';
	import SendQrCodeScan from '$lib/components/send/SendQRCodeScan.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NetworkId } from '$lib/types/network';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		mapNetworkIdToBitcoinNetwork
	} from '$lib/utils/network.utils';
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

	const send = async () => {
		const network = nonNullish(networkId) ? mapNetworkIdToBitcoinNetwork(networkId) : undefined;

		if (isNullish(network)) {
			toastsError({
				msg: { text: $i18n.send.error.no_btc_network_id }
			});
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		if (isNullish(utxosFee)) {
			toastsError({
				msg: { text: $i18n.send.assertion.utxos_fee_missing }
			});
			return;
		}

		if (isNullish($sendToken)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		dispatch('icNext');

		try {
			// TODO: add tracking
			await sendBtc({
				destination,
				amount,
				utxosFee,
				progress,
				network,
				source,
				identity: $authIdentity
			});

			sendProgressStep = ProgressStepsSendBtc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};
</script>

{#if currentStep?.name === WizardStepsSend.REVIEW}
	<BtcSendReview
		on:icBack
		on:icSend={send}
		bind:utxosFee
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

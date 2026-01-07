<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import UtxosFeeContext from '$btc/components/fee/UtxosFeeContext.svelte';
	import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
	import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
	import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
	import { sendBtc, validateBtcSend } from '$btc/services/btc-send.services';
	import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
	import {
		initUtxosFeeStore,
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import {
		TRACK_COUNT_BTC_SEND_ERROR,
		TRACK_COUNT_BTC_SEND_SUCCESS,
		TRACK_COUNT_BTC_VALIDATION_ERROR
	} from '$lib/constants/analytics.constants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		mapNetworkIdToBitcoinNetwork
	} from '$lib/utils/network.utils';

	interface Props {
		currentStep?: WizardStep;
		destination?: string;
		amount: OptionAmount;
		sendProgressStep: string;
		selectedContact?: ContactUi;
		onBack: () => void;
		onClose: () => void;
		onNext: () => void;
		onSendBack: () => void;
		onTokensList: () => void;
	}

	let {
		currentStep,
		destination = '',
		amount = $bindable(),
		sendProgressStep = $bindable(),
		selectedContact,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	}: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: utxosFeeStore } = getContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY);

	let networkId = $derived($sendToken.network.id);

	let source = $derived(
		(isNetworkIdBTCTestnet(networkId)
			? $btcAddressTestnet
			: isNetworkIdBTCRegtest(networkId)
				? $btcAddressRegtest
				: $btcAddressMainnet) ?? ''
	);

	const progress = (step: ProgressStepsSendBtc) => (sendProgressStep = step);

	let amountError = $state(false);

	const close = () => onClose();
	const back = () => onSendBack();

	const send = async () => {
		progress(ProgressStepsSendBtc.INITIALIZATION);

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

		if (isNullish($utxosFeeStore?.utxosFee)) {
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
			return;
		}

		onNext();

		const sendTrackingEventMetadata = {
			token: $sendToken.symbol,
			network: `${networkId.description}`,
			feeSatoshis: $utxosFeeStore.utxosFee.feeSatoshis.toString()
		};

		if (BTC_EXTENSION_FEATURE_FLAG_ENABLED) {
			// Validate UTXOs before proceeding
			try {
				await validateBtcSend({
					utxosFee: $utxosFeeStore.utxosFee,
					source,
					amount,
					network,
					identity: $authIdentity
				});
			} catch (_: unknown) {
				trackEvent({
					name: TRACK_COUNT_BTC_VALIDATION_ERROR,
					metadata: sendTrackingEventMetadata
				});

				// go back to the previous step so the user can correct/ try again
				onBack();

				return;
			}
		}

		try {
			progress(ProgressStepsSendBtc.SEND);
			await sendBtc({
				destination,
				amount,
				utxosFee: $utxosFeeStore.utxosFee,
				network,
				source,
				identity: $authIdentity
			});

			trackEvent({
				name: TRACK_COUNT_BTC_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			progress(ProgressStepsSendBtc.DONE);

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_BTC_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};
</script>

<UtxosFeeContext {amount} {amountError} {networkId} {source}>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<BtcSendReview {amount} {destination} {onBack} onSend={send} {selectedContact} {source} />
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<BtcSendProgress {sendProgressStep} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<BtcSendForm
				{onBack}
				{onNext}
				{onTokensList}
				{selectedContact}
				{source}
				bind:destination
				bind:amount
			>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</BtcSendForm>
		{/if}
	{/key}
</UtxosFeeContext>

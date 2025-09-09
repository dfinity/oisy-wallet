<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { type Snippet, createEventDispatcher, getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
	import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
	import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
	import { sendBtc, validateBtcSend } from '$btc/services/btc-send.services';
	import { BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import {
		TRACK_COUNT_BTC_SEND_ERROR,
		TRACK_COUNT_BTC_SEND_SUCCESS,
		TRACK_COUNT_BTC_VALIDATION_ERROR
	} from '$lib/constants/analytics.contants';
	import {
		btcAddressMainnet,
		btcAddressRegtest,
		btcAddressTestnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdBTCRegtest,
		isNetworkIdBTCTestnet,
		mapNetworkIdToBitcoinNetwork
	} from '$lib/utils/network.utils';

	interface Props {
		currentStep: WizardStep | undefined;
		destination?: string;
		amount?: OptionAmount;
		sendProgressStep: string;
		selectedContact?: ContactUi;
		children?: Snippet;
	}

	let {
		currentStep,
		destination = $bindable(''),
		amount = $bindable(),
		sendProgressStep = $bindable(),
		selectedContact = undefined,
		children
	}: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const progress = (step: ProgressStepsSendBtc) => (sendProgressStep = step);

	let utxosFee: UtxosFee | undefined = $state(undefined);

	let networkId: NetworkId | undefined = $state(undefined);
	run(() => {
		networkId = $sendToken.network.id;
	});

	let source: string = $derived(
		(isNetworkIdBTCTestnet(networkId)
			? $btcAddressTestnet
			: isNetworkIdBTCRegtest(networkId)
				? $btcAddressRegtest
				: $btcAddressMainnet) ?? ''
	);

	const dispatch = createEventDispatcher();

	const close = () => dispatch('icClose');
	const back = () => dispatch('icSendBack');
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

		// Validate UTXOs before proceeding
		try {
			await validateBtcSend({
				utxosFee,
				source,
				amount,
				network,
				identity: $authIdentity
			});
		} catch (err: unknown) {
			// Handle BtcValidationError with specific toastsError for each type
			if (err instanceof BtcValidationError) {
				utxosFee.error = err.type;
			}

			trackEvent({
				name: TRACK_COUNT_BTC_VALIDATION_ERROR,
				metadata: {
					token: $sendToken.symbol,
					network: `${networkId?.description ?? 'unknown'}`
				}
			});

			// go back to the previous step so the user can correct/ try again
			dispatch('icBack');
			return;
		}

		try {
			progress(ProgressStepsSendBtc.SEND);
			await sendBtc({
				destination,
				amount,
				utxosFee,
				network,
				source,
				identity: $authIdentity
			});

			trackEvent({
				name: TRACK_COUNT_BTC_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol,
					network: `${networkId.description}`
				}
			});

			progress(ProgressStepsSendBtc.DONE);

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_BTC_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol,
					network: `${networkId.description}`
				}
			});

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
		{amount}
		{destination}
		{selectedContact}
		{source}
		on:icBack
		on:icSend={send}
		bind:utxosFee
	/>
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<BtcSendProgress bind:sendProgressStep />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<BtcSendForm
		{selectedContact}
		on:icNext
		on:icClose
		on:icBack
		on:icTokensList
		bind:destination
		bind:amount
	>
		{#snippet cancel()}
			<ButtonBack onclick={back} />
		{/snippet}
	</BtcSendForm>
{:else}
	{@render children?.()}
{/if}

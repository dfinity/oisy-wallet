<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import BtcSendForm from '$btc/components/send/BtcSendForm.svelte';
	import BtcSendProgress from '$btc/components/send/BtcSendProgress.svelte';
	import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
	import { sendBtc, validateUtxosForSend } from '$btc/services/btc-send.services';
	import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import { TRACK_COUNT_BTC_SEND_ERROR, TRACK_COUNT_BTC_SEND_SUCCESS } from '$lib/constants/analytics.contants';
	import { btcAddressMainnet, btcAddressRegtest, btcAddressTestnet } from '$lib/derived/address.derived';
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
	import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet, mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

	export let currentStep: WizardStep | undefined;
	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let sendProgressStep: string;
	export let selectedContact: ContactUi | undefined = undefined;

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

		// Validate UTXOs before proceeding
		try {
			validateUtxosForSend({
				utxosFee,
				source,
				amount,
				feeRateSatoshisPerVByte: 2n
			});
		} catch (err: unknown) {
			// Handle BtcValidationError with specific toastsError for each type
			if (err instanceof BtcValidationError) {
				switch (err.type) {
					case BtcSendValidationError.InsufficientBalance:
						toastsError({
							msg: { text: $i18n.send.assertion.btc_insufficient_balance }
						});
						break;
					case BtcSendValidationError.InsufficientBalanceForFee:
						toastsError({
							msg: { text: $i18n.send.assertion.btc_insufficient_balance_for_fee }
						});
						break;
					case BtcSendValidationError.InvalidUtxoData:
						toastsError({
							msg: { text: $i18n.send.assertion.btc_invalid_utxo_data }
						});
						break;
					case BtcSendValidationError.UtxoLocked:
						toastsError({
							msg: { text: $i18n.send.assertion.btc_utxo_locked }
						});
						break;
					case BtcSendValidationError.InvalidFeeCalculation:
						toastsError({
							msg: { text: $i18n.send.assertion.btc_invalid_fee_calculation }
						});
						break;
					case BtcSendValidationError.MinimumBalance:
						toastsError({
							msg: { text: $i18n.send.assertion.minimum_btc_amount }
						});
						break;
					default:
						toastsError({
							msg: { text: $i18n.send.error.unexpected },
							err
						});
						break;
				}
			} else {
				toastsError({
					msg: { text: $i18n.send.error.unexpected },
					err
				});
			}
			return;
		}

		dispatch('icNext');

		try {
			// TODO: add tracking
			await sendBtc({
				destination,
				amount,
				utxosFee,
				network,
				source,
				identity: $authIdentity,
				onProgress: () => {
					if (sendProgressStep === ProgressStepsSendBtc.INITIALIZATION) {
						progress(ProgressStepsSendBtc.SEND);
					} else if (sendProgressStep === ProgressStepsSendBtc.SEND) {
						progress(ProgressStepsSendBtc.DONE);
					}
				}
			});

			trackEvent({
				name: TRACK_COUNT_BTC_SEND_SUCCESS,
				metadata: {
					token: $sendToken.symbol,
					network: `${networkId.description}`
				}
			});

			sendProgressStep = ProgressStepsSendBtc.DONE;

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
		on:icBack
		on:icSend={send}
		bind:utxosFee
		{destination}
		{selectedContact}
		{amount}
		{source}
	/>
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<BtcSendProgress bind:sendProgressStep />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<BtcSendForm
		{source}
		{selectedContact}
		on:icNext
		on:icClose
		on:icBack
		on:icTokensList
		bind:destination
		bind:amount
	>
		<ButtonBack onclick={back} slot="cancel" />
	</BtcSendForm>
{:else}
	<slot />
{/if}

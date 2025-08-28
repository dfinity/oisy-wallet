<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import BtcSendWarnings from '$btc/components/send/BtcSendWarnings.svelte';
	import BtcUtxosFee from '$btc/components/send/BtcUtxosFee.svelte';
	import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
	import { BtcPendingSentTransactionsStatus } from '$btc/derived/btc-pending-sent-transactions-status.derived';
	import {
		handleBtcValidationError,
		sendBtc,
		validateBtcSend
	} from '$btc/services/btc-send.services';
	import { BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
	import { getBtcSourceAddress } from '$btc/utils/btc-address.utils';
	import { convertSatoshisToBtc } from '$btc/utils/btc-send.utils';
	import { invalidSendAmount } from '$btc/utils/input.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AI_ASSISTANT_SEND_TOKEN_SOURCE,
		TRACK_COUNT_BTC_SEND_ERROR,
		TRACK_COUNT_BTC_SEND_SUCCESS,
		TRACK_COUNT_BTC_VALIDATION_ERROR
	} from '$lib/constants/analytics.contants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		AI_ASSISTANT_SEND_TOKENS_BUTTON,
		AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Address } from '$lib/types/address';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		amount: number;
		destination: Address;
		sendCompleted: boolean;
	}

	let { amount, destination, sendCompleted = $bindable() }: Props = $props();

	const { sendTokenNetworkId, sendTokenDecimals, sendToken, sendBalance, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let source = $derived(getBtcSourceAddress($sendTokenNetworkId));

	let loading = $state(false);

	let parsedAmount = $derived(
		parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		})
	);

	let amountErrorMessage = $derived.by(() => {
		if (invalidAmount(amount) || parsedAmount === ZERO) {
			return $i18n.send.assertion.amount_invalid;
		}

		if (invalidSendAmount(`${parsedAmount}`)) {
			return replacePlaceholders($i18n.send.assertion.minimum_btc_amount, {
				$amount: convertSatoshisToBtc(BTC_MINIMUM_AMOUNT)
			});
		}

		if (parsedAmount > ($sendBalance ?? ZERO)) {
			return $i18n.send.assertion.insufficient_funds;
		}
	});

	let utxosFee = $derived<UtxosFee | undefined>(undefined);

	let invalidDestination = $derived(
		isInvalidDestinationBtc({
			destination,
			networkId: $sendTokenNetworkId
		}) || isNullishOrEmpty(destination)
	);

	let invalid = $derived(
		invalidDestination ||
			notEmptyString(amountErrorMessage) ||
			isNullish(amount) ||
			isNullish(utxosFee) ||
			(nonNullish(utxosFee) && utxosFee.utxos.length === 0) ||
			nonNullish(utxosFee.error)
	);

	const send = async () => {
		const network = nonNullish($sendTokenNetworkId)
			? mapNetworkIdToBitcoinNetwork($sendTokenNetworkId)
			: undefined;

		const trackingEventMetadata = {
			token: $sendTokenSymbol,
			network: `${$sendTokenNetworkId.description}`,
			source: AI_ASSISTANT_SEND_TOKEN_SOURCE
		};

		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

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

		loading = true;

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
			loading = false;
			sendCompleted = false;

			// Handle BtcValidationError with specific toastsError for each type
			if (err instanceof BtcValidationError) {
				await handleBtcValidationError({ err });
			}

			trackEvent({
				name: TRACK_COUNT_BTC_VALIDATION_ERROR,
				metadata: trackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			return;
		}
		try {
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
				metadata: trackingEventMetadata
			});

			loading = false;
			sendCompleted = true;
		} catch (err: unknown) {
			loading = false;
			sendCompleted = false;

			trackEvent({
				name: TRACK_COUNT_BTC_SEND_ERROR,
				metadata: trackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});
		}
	};
</script>

<div class="mb-8 mt-2">
	<BtcUtxosFee {amount} networkId={$sendTokenNetworkId} {source} bind:utxosFee />
</div>

{#if !sendCompleted}
	<div class="mb-2">
		<!-- TODO remove pendingTransactionsStatus as soon as parallel BTC transactions are also enabled for BTC convert -->
		<BtcSendWarnings pendingTransactionsStatus={BtcPendingSentTransactionsStatus.NONE} {utxosFee} />
	</div>

	{#if notEmptyString(amountErrorMessage) || invalidDestination}
		<p class="mb-2 text-center text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
			{notEmptyString(amountErrorMessage)
				? amountErrorMessage
				: $i18n.send.assertion.invalid_destination_address}
		</p>
	{/if}

	<Button
		disabled={invalid}
		fullWidth
		{loading}
		onclick={send}
		paddingSmall
		testId={AI_ASSISTANT_SEND_TOKENS_BUTTON}
	>
		{$i18n.send.text.send}
	</Button>
{:else}
	<p class="text-sm text-success-primary" data-tid={AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE}>
		{$i18n.ai_assistant.text.send_token_succeeded}
	</p>
{/if}

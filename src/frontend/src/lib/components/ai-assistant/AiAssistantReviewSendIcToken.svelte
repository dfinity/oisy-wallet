<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import IcTokenFee from '$icp/components/fee/IcTokenFee.svelte';
	import { sendIc } from '$icp/services/ic-send.services';
	import type { IcTransferParams } from '$icp/types/ic-send';
	import type { IcToken } from '$icp/types/ic-token';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AI_ASSISTANT_REVIEW_SEND_TOOL_CONFIRMATION,
		AI_ASSISTANT_SEND_TOKEN_SOURCE,
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS
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
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: number;
		destination: Address;
		sendCompleted: boolean;
		sendEnabled: boolean;
	}

	let { amount, destination, sendCompleted = $bindable(), sendEnabled }: Props = $props();

	const { sendToken, sendBalance, sendTokenStandard, sendTokenSymbol, sendTokenDecimals } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let parsedAmount = $derived(
		parseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		})
	);

	let amountError = $derived(parsedAmount + ($sendToken as IcToken).fee > ($sendBalance ?? ZERO));

	let invalidDestination = $derived(
		isNullishOrEmpty(destination) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard
			})
	);

	let invalid = $derived(!sendEnabled || invalidDestination || amountError || isNullish(amount));

	let loading = $state(false);

	const send = async () => {
		const sharedTrackingEventMetadata = {
			token: $sendTokenSymbol
		};

		trackEvent({
			name: AI_ASSISTANT_REVIEW_SEND_TOOL_CONFIRMATION,
			metadata: sharedTrackingEventMetadata
		});

		const sendTrackingEventMetadata = {
			...sharedTrackingEventMetadata,
			source: AI_ASSISTANT_SEND_TOKEN_SOURCE
		};

		if (isNullish($authIdentity)) {
			await nullishSignOut();
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

		if (isNullish($sendToken)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		try {
			loading = true;

			const params: IcTransferParams = {
				to: destination,
				amount: parsedAmount,
				identity: $authIdentity
			};

			const trackAnalyticsOnSendComplete = () => {
				trackEvent({
					name: TRACK_COUNT_IC_SEND_SUCCESS,
					metadata: sendTrackingEventMetadata
				});
			};

			await sendIc({
				...params,
				token: $sendToken as IcToken,
				sendCompleted: trackAnalyticsOnSendComplete
			});

			sendCompleted = true;
			loading = false;
		} catch (err: unknown) {
			sendCompleted = false;
			loading = false;

			trackEvent({
				name: TRACK_COUNT_IC_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});
		}
	};
</script>

<div class="mb-8 mt-2">
	<IcTokenFee />
</div>

{#if !sendCompleted}
	{#if amountError || invalidDestination}
		<p class="mb-2 text-center text-sm text-error-primary" transition:slide={SLIDE_DURATION}>
			{amountError
				? $i18n.send.assertion.insufficient_funds
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
	<p
		class="text-center text-sm text-success-primary"
		data-tid={AI_ASSISTANT_SEND_TOKENS_SUCCESS_MESSAGE}
	>
		{$i18n.ai_assistant.text.send_token_succeeded}
	</p>
{/if}

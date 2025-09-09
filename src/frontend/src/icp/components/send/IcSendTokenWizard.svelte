<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { type Snippet, createEventDispatcher, getContext } from 'svelte';
	import IcSendForm from '$icp/components/send/IcSendForm.svelte';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import IcSendReview from '$icp/components/send/IcSendReview.svelte';
	import { sendIc } from '$icp/services/ic-send.services';
	import type { IcTransferParams } from '$icp/types/ic-send';
	import type { IcToken } from '$icp/types/ic-token';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import {
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		/**
		 * Props
		 */
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

	const dispatch = createEventDispatcher();

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendToken, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Send
	 */

	const send = async () => {
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

		dispatch('icNext');

		try {
			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step)
			};

			const trackAnalyticsOnSendComplete = () => {
				trackEvent({
					name: TRACK_COUNT_IC_SEND_SUCCESS,
					metadata: {
						token: $sendTokenSymbol
					}
				});
			};

			await sendIc({
				...params,
				token: $sendToken as IcToken,
				sendCompleted: trackAnalyticsOnSendComplete
			});

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_IC_SEND_ERROR,
				metadata: {
					token: $sendTokenSymbol
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			dispatch('icBack');
		}
	};

	const back = () => dispatch('icSendBack');
	const close = () => dispatch('icClose');
</script>

{#if currentStep?.name === WizardStepsSend.REVIEW}
	<IcSendReview {amount} {destination} {selectedContact} on:icBack on:icSend={send} />
{:else if currentStep?.name === WizardStepsSend.SENDING}
	<IcSendProgress bind:sendProgressStep />
{:else if currentStep?.name === WizardStepsSend.SEND}
	<IcSendForm on:icNext on:icBack on:icTokensList {selectedContact} bind:destination bind:amount>
		{#snippet cancel()}
			<ButtonBack onclick={back} />
		{/snippet}
	</IcSendForm>
{:else}
	{@render children?.()}
{/if}

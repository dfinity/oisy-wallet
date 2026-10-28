<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, onDestroy } from 'svelte';
	import IcSendForm from '$icp/components/send/IcSendForm.svelte';
	import IcSendProgress from '$icp/components/send/IcSendProgress.svelte';
	import IcSendReview from '$icp/components/send/IcSendReview.svelte';
	import { sendIc } from '$icp/services/ic-send.services';
	import { sendNft } from '$icp/services/nft-send.services';
	import { MobileSendSessionExpiredError, type IcTransferParams } from '$icp/types/ic-send';
	import type { IcToken } from '$icp/types/ic-token';
	import { toIcNftSendErrorType } from '$icp/utils/ic-nft.utils';
	import { isMobileSendDestination } from '$icp/utils/ic-send.utils';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import {
		TRACK_COUNT_IC_SEND_ERROR,
		TRACK_COUNT_IC_SEND_SUCCESS,
		TRACK_NFT_SEND
	} from '$lib/constants/analytics.constants';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { idleSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft, NonFungibleToken } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';
	import type { WizardStep } from '$lib/types/wizard';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	/**
	 * Props
	 */

	interface Props {
		currentStep?: WizardStep;
		destination?: string;
		amount: OptionAmount;
		sendProgressStep: string;
		selectedContact?: ContactUi;
		nft?: Nft;
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
		nft,
		onBack,
		onClose,
		onNext,
		onSendBack,
		onTokensList
	}: Props = $props();

	/**
	 * Send context store
	 */

	const { sendTokenDecimals, sendToken, sendTokenSymbol } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	/**
	 * Send
	 */

	const nftSend = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		if (isNullish(nft)) {
			toastsError({
				msg: { text: $i18n.send.assertion.no_nft_selected }
			});
			return;
		}

		onNext();

		try {
			await sendNft({
				token: $sendToken as NonFungibleToken,
				tokenId: nft.id,
				to: destination,
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => (sendProgressStep = step)
			});

			trackEvent({
				name: TRACK_NFT_SEND,
				metadata: {
					resultStatus: 'success',
					token: $sendToken.symbol,
					collection: nft.collection.name ?? '',
					address: nft.collection.address,
					tokenId: String(nft.id),
					network: $sendToken.network.name
				}
			});

			sendProgressStep = ProgressStepsSendIc.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_NFT_SEND,
				metadata: {
					resultStatus: 'error',
					token: $sendToken.symbol,
					collection: nft.collection.name ?? '',
					address: nft.collection.address,
					tokenId: String(nft.id),
					network: $sendToken.network.name,
					result_error_type: toIcNftSendErrorType(err)
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};

	let submitting = false;
	let disposed = false;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => {
		disposed = true;
		clearTimeout(closeTimer);
	});

	const send = async () => {
		if (submitting || disposed || currentStep?.name !== WizardStepsSend.REVIEW) {
			return;
		}
		if (MOBILE_SHELL && !isMobileSendDestination({ token: $sendToken, destination })) {
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

		// Latch synchronously: two taps before Svelte paints SENDING are still one transfer.
		submitting = true;
		onNext();

		try {
			const params: IcTransferParams = {
				to: destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				identity: $authIdentity,
				progress: (step: ProgressStepsSendIc) => {
					if (!disposed) {
						sendProgressStep = step;
					}
				}
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

			if (!disposed) {
				sendProgressStep = ProgressStepsSendIc.DONE;
				closeTimer = setTimeout(() => close(), 750);
			}
		} catch (err: unknown) {
			if (disposed) {
				return;
			}
			if (MOBILE_SHELL && err instanceof MobileSendSessionExpiredError) {
				await idleSignOut();
				return;
			}
			if (MOBILE_SHELL) {
				// A transport failure can arrive after the ledger accepted the send.
				// Close the intent instead of offering an immediate second payment.
				toastsError({ msg: { text: $i18n.send.error.mobile_unconfirmed } });
				close();
				return;
			}
			submitting = false;
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

			onBack();
		}
	};

	const back = () => onSendBack();
	const close = () => onClose();
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<IcSendReview
			{amount}
			{destination}
			{nft}
			{onBack}
			onSend={nonNullish(nft) ? nftSend : send}
			{selectedContact}
		/>
	{:else if currentStep?.name === WizardStepsSend.SENDING}
		<IcSendProgress {sendProgressStep} />
	{:else if currentStep?.name === WizardStepsSend.SEND}
		<IcSendForm {onBack} {onNext} {onTokensList} {selectedContact} bind:destination bind:amount>
			{#snippet cancel()}
				<ButtonBack onclick={back} />
			{/snippet}
		</IcSendForm>
	{/if}
{/key}

<script lang="ts">
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_COUNT_XRP_SEND_ERROR,
		TRACK_COUNT_XRP_SEND_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdXrp } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
	import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
	import XrpSendReview from '$xrp/components/send/XrpSendReview.svelte';
	import { sendSteps } from '$xrp/constants/steps.constants';
	import { sendXrp } from '$xrp/services/xrp-send.services';
	import {
		initFeeStore,
		initXrpFeeContext,
		XRP_FEE_CONTEXT_KEY,
		type XrpFeeContext as XrpFeeContextType
	} from '$xrp/stores/xrp-fee.store';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';

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

	const { sendToken, sendTokenDecimals, sendXrpDestinationTag } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let networkId = $derived($sendToken?.network.id);

	let source = $derived($xrpAddressMainnet);

	/**
	 * Fee context store
	 */

	const feeStore = initFeeStore();

	const feeSymbolStore = writable<string | undefined>(XRP_TOKEN.symbol);
	const feeTokenIdStore = writable<TokenId | undefined>(XRP_TOKEN.id);
	const feeDecimalsStore = writable<number | undefined>(XRP_TOKEN.decimals);
	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[XRP_TOKEN.id]?.usd);
	});

	setContext<XrpFeeContextType>(
		XRP_FEE_CONTEXT_KEY,
		initXrpFeeContext({
			feeStore,
			feeSymbolStore,
			feeDecimalsStore,
			feeTokenIdStore,
			feeExchangeRateStore
		})
	);

	/**
	 * Send
	 */

	const close = () => onClose();
	const back = () => onSendBack();

	const send = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const network = nonNullish(networkId) ? mapNetworkIdToNetwork(networkId) : undefined;

		if (isNullish(networkId) || !isNetworkIdXrp(networkId) || isNullish(network)) {
			toastsError({
				msg: { text: $i18n.send.error.no_xrp_network_id }
			});
			return;
		}

		// This should not happen, it is just a safety check for types
		assertNonNullish(source);

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

		onNext();

		const sendTrackingEventMetadata = {
			token: $sendToken.symbol,
			network: `${$sendToken.network.id.description}`,
			...(nonNullish($feeStore) ? { fee: $feeStore.toString() } : {})
		};

		try {
			await sendXrp({
				identity: $authIdentity,
				progress: (step: ProgressStepsSendXrp) => (sendProgressStep = step),
				network,
				source,
				destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				destinationTag: $sendXrpDestinationTag
			});

			trackEvent({
				name: TRACK_COUNT_XRP_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_XRP_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			if (sendProgressStep === ProgressStepsSendXrp.CONFIRM) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_confirmation_failed },
					err
				});

				setTimeout(() => close(), 750);

				return;
			}

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};
</script>

<XrpFeeContext observe={currentStep?.name !== WizardStepsSend.SENDING} token={$sendToken}>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<XrpSendReview
				{amount}
				{destination}
				network={$sendToken?.network}
				{onBack}
				onSend={send}
				{selectedContact}
			/>
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<XrpSendForm {onBack} {onNext} {onTokensList} {selectedContact} bind:destination bind:amount>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</XrpSendForm>
		{/if}
	{/key}
</XrpFeeContext>

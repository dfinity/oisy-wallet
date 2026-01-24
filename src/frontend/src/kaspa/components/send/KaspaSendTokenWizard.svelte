<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { KASPA_MAINNET_TOKEN, KASPA_TESTNET_TOKEN } from '$env/tokens/tokens.kaspa.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_COUNT_KASPA_SEND_ERROR,
		TRACK_COUNT_KASPA_SEND_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { kaspaAddressMainnet, kaspaAddressTestnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSendKaspa } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdKaspa, isNetworkIdKASTestnet } from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import KaspaFeeContext from '$kaspa/components/fee/KaspaFeeContext.svelte';
	import KaspaSendForm from '$kaspa/components/send/KaspaSendForm.svelte';
	import KaspaSendReview from '$kaspa/components/send/KaspaSendReview.svelte';
	import { sendSteps } from '$kaspa/constants/steps.constants';
	import { sendKaspa } from '$kaspa/services/kaspa-send.services';
	import { getKaspaPublicKey } from '$kaspa/services/kaspa-address.services';
	import {
		KASPA_FEE_CONTEXT_KEY,
		type KaspaFeeContext as KaspaFeeContextType,
		initKaspaFeeContext,
		initFeeStore,
		initUtxosFeeStore
	} from '$kaspa/stores/kaspa-fee.store';
	import type { KaspaNetworkType } from '$kaspa/types/kaspa-send';

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

	const { sendToken, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let network = $derived($sendToken?.network);

	let networkId = $derived(network?.id);

	let [source, kaspaNativeToken] = $derived(
		isNetworkIdKASTestnet(networkId)
			? [$kaspaAddressTestnet, KASPA_TESTNET_TOKEN]
			: [$kaspaAddressMainnet, KASPA_MAINNET_TOKEN]
	);

	let kaspaNetwork = $derived<KaspaNetworkType>(
		isNetworkIdKASTestnet(networkId) ? 'testnet' : 'mainnet'
	);

	/**
	 * Fee context store
	 */

	const feeStore = initFeeStore();
	const utxosFeeStore = initUtxosFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(kaspaNativeToken.symbol);
		feeTokenIdStore.set(kaspaNativeToken.id);
		feeDecimalsStore.set(kaspaNativeToken.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[kaspaNativeToken.id]?.usd);
	});

	setContext<KaspaFeeContextType>(
		KASPA_FEE_CONTEXT_KEY,
		initKaspaFeeContext({
			feeStore,
			utxosFeeStore,
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

		if (isNullish(networkId) || !isNetworkIdKaspa(networkId)) {
			toastsError({
				msg: { text: $i18n.send.error.unexpected }
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
			sendProgressStep = ProgressStepsSendKaspa.INITIALIZATION;

			// Get public key for signing
			const publicKey = await getKaspaPublicKey({
				identity: $authIdentity,
				network: kaspaNetwork
			});

			sendProgressStep = ProgressStepsSendKaspa.SIGN;

			await sendKaspa({
				identity: $authIdentity,
				source,
				destination,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				network: kaspaNetwork,
				publicKey
			});

			sendProgressStep = ProgressStepsSendKaspa.SEND;

			trackEvent({
				name: TRACK_COUNT_KASPA_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			sendProgressStep = ProgressStepsSendKaspa.DONE;

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_KASPA_SEND_ERROR,
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

<KaspaFeeContext
	source={source ?? ''}
	{amount}
	observe={currentStep?.name !== WizardStepsSend.SENDING}
>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<KaspaSendReview
				{amount}
				{destination}
				{networkId}
				{onBack}
				onSend={send}
				{selectedContact}
			/>
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<KaspaSendForm {onBack} {onNext} {onTokensList} {selectedContact} bind:destination bind:amount>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</KaspaSendForm>
		{/if}
	{/key}
</KaspaFeeContext>

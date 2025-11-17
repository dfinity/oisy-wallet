<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
	import { isSolanaError, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED } from '@solana/kit';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_COUNT_SOL_SEND_ERROR,
		TRACK_COUNT_SOL_SEND_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import {
		isNetworkIdSolana,
		isNetworkIdSOLDevnet,
		isNetworkIdSOLLocal
	} from '$lib/utils/network.utils';
	import { parseToken } from '$lib/utils/parse.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import SolSendForm from '$sol/components/send/SolSendForm.svelte';
	import SolSendReview from '$sol/components/send/SolSendReview.svelte';
	import { sendSteps } from '$sol/constants/steps.constants';
	import { sendSol } from '$sol/services/sol-send.services';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';

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

	let [source, solanaNativeToken] = $derived(
		isNetworkIdSOLDevnet(networkId)
			? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
			: isNetworkIdSOLLocal(networkId)
				? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
				: [$solAddressMainnet, SOLANA_TOKEN]
	);

	/**
	 * Fee context store
	 */

	const feeStore = initFeeStore();
	const prioritizationFeeStore = initFeeStore();
	const ataFeeStore = initFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	const feeDecimalsStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeSymbolStore.set(solanaNativeToken.symbol);
		feeTokenIdStore.set(solanaNativeToken.id);
		feeDecimalsStore.set(solanaNativeToken.decimals);
	});

	const feeExchangeRateStore = writable<number | undefined>(undefined);

	$effect(() => {
		feeExchangeRateStore.set($exchanges?.[solanaNativeToken.id]?.usd);
	});

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
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

		if (isNullish(networkId) || !isNetworkIdSolana(networkId)) {
			toastsError({
				msg: { text: $i18n.send.error.no_solana_network_id }
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
			...(nonNullish($prioritizationFeeStore)
				? { prioritizationFee: $prioritizationFeeStore.toString() }
				: {}),
			...(nonNullish($ataFeeStore) ? { ataFee: $ataFeeStore.toString() } : {}),
			...(nonNullish($feeStore) ? { fee: $feeStore.toString() } : {})
		};

		try {
			await sendSol({
				identity: $authIdentity,
				progress: (step: ProgressStepsSendSol) => (sendProgressStep = step),
				token: $sendToken,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				prioritizationFee: $prioritizationFeeStore ?? ZERO,
				destination,
				source
			});

			trackEvent({
				name: TRACK_COUNT_SOL_SEND_SUCCESS,
				metadata: sendTrackingEventMetadata
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_SOL_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			if (sendProgressStep === ProgressStepsSendSol.CONFIRM) {
				toastsError({
					msg: { text: $i18n.send.error.solana_confirmation_failed },
					err
				});

				setTimeout(() => close(), 750);

				return;
			}

			const errorMsg = isSolanaError(err, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)
				? $i18n.send.error.solana_transaction_expired
				: $i18n.send.error.unexpected;

			toastsError({
				msg: { text: errorMsg },
				err
			});

			onBack();
		}
	};
</script>

<SolFeeContext {destination} observe={currentStep?.name !== WizardStepsSend.SENDING}>
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSend.REVIEW}
			<SolSendReview {amount} {destination} {network} {onBack} onSend={send} {selectedContact} />
		{:else if currentStep?.name === WizardStepsSend.SENDING}
			<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
		{:else if currentStep?.name === WizardStepsSend.SEND}
			<SolSendForm {onBack} {onNext} {onTokensList} {selectedContact} bind:destination bind:amount>
				{#snippet cancel()}
					<ButtonBack onclick={back} />
				{/snippet}
			</SolSendForm>
		{/if}
	{/key}
</SolFeeContext>

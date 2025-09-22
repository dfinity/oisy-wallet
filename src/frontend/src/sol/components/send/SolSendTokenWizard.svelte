<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { assertNonNullish, isNullish } from '@dfinity/utils';
	import { isSolanaError, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED } from '@solana/kit';
	import { type Snippet, createEventDispatcher, getContext, setContext } from 'svelte';
	import { run } from 'svelte/legacy';
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
	} from '$lib/constants/analytics.contants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		solAddressDevnet,
		solAddressLocal,
		solAddressMainnet
	} from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionSolAddress } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import type { Network, NetworkId } from '$lib/types/network';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token, TokenId } from '$lib/types/token';
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

	const { sendToken, sendTokenDecimals } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let network: Network | undefined = $state(undefined);
	run(() => {
		({ network } = $sendToken);
	});

	let networkId: NetworkId | undefined = $state(undefined);
	run(() => {
		({ id: networkId } = network);
	});

	let source: OptionSolAddress = $state();
	let solanaNativeToken: Token = $state();
	run(() => {
		[source, solanaNativeToken] = isNetworkIdSOLDevnet(networkId)
			? [$solAddressDevnet, SOLANA_DEVNET_TOKEN]
			: isNetworkIdSOLLocal(networkId)
				? [$solAddressLocal, SOLANA_LOCAL_TOKEN]
				: [$solAddressMainnet, SOLANA_TOKEN];
	});

	/**
	 * Fee context store
	 */

	const feeStore = initFeeStore();
	const prioritizationFeeStore = initFeeStore();
	const ataFeeStore = initFeeStore();

	const feeSymbolStore = writable<string | undefined>(undefined);
	run(() => {
		feeSymbolStore.set(solanaNativeToken.symbol);
	});

	const feeTokenIdStore = writable<TokenId | undefined>(undefined);
	run(() => {
		feeTokenIdStore.set(solanaNativeToken.id);
	});

	const feeDecimalsStore = writable<number | undefined>(undefined);
	run(() => {
		feeDecimalsStore.set(solanaNativeToken.decimals);
	});

	setContext<FeeContextType>(
		SOL_FEE_CONTEXT_KEY,
		initFeeContext({
			feeStore,
			prioritizationFeeStore,
			ataFeeStore,
			feeSymbolStore,
			feeDecimalsStore,
			feeTokenIdStore
		})
	);

	/**
	 * Send
	 */

	const dispatch = createEventDispatcher();

	const close = () => dispatch('icClose');
	const back = () => dispatch('icSendBack');

	const send = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
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

		dispatch('icNext');

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
				metadata: {
					token: $sendToken.symbol
				}
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_SOL_SEND_ERROR,
				metadata: {
					token: $sendToken.symbol
				}
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

			dispatch('icBack');
		}
	};
</script>

<SolFeeContext {destination} observe={currentStep?.name !== WizardStepsSend.SENDING}>
	{#if currentStep?.name === WizardStepsSend.REVIEW}
		<SolSendReview {amount} {destination} {network} {selectedContact} on:icBack on:icSend={send} />
	{:else if currentStep?.name === WizardStepsSend.SENDING}
		<InProgressWizard progressStep={sendProgressStep} steps={sendSteps($i18n)} />
	{:else if currentStep?.name === WizardStepsSend.SEND}
		<SolSendForm
			{selectedContact}
			on:icNext
			on:icClose
			on:icTokensList
			on:icBack
			bind:destination
			bind:amount
		>
			{#snippet cancel()}
				<ButtonBack onclick={back} />
			{/snippet}
		</SolSendForm>
	{/if}
</SolFeeContext>

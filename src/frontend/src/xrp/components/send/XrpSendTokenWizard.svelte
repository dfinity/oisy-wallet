<script lang="ts">
	import { assertNever, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import { TRACK_COUNT_XRP_SEND_ERROR } from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
	import { WizardStepsSend } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError, toastsShow } from '$lib/stores/toasts.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdXrp } from '$lib/utils/network.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
	import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
	import XrpSendReview from '$xrp/components/send/XrpSendReview.svelte';
	import { sendSteps } from '$xrp/constants/steps.constants';
	import { XRP_BASE_RESERVE_DROPS, XRP_TRANSFER_RATE_NO_FEE } from '$xrp/constants/xrp.constants';
	import { sendXrp } from '$xrp/services/xrp-send.services';
	import {
		initFeeStore,
		initReserveStore,
		initTransferRateStore,
		initXrpFeeContext,
		XRP_FEE_CONTEXT_KEY,
		type XrpFeeContext as XrpFeeContextType
	} from '$xrp/stores/xrp-fee.store';
	import {
		XrpAmountExceedsSendableError,
		XrpDestinationTagRequiredError,
		XrpDestinationUnfundedError,
		XrpPaymentRefusedError,
		XrpSelfDestinationError,
		XrpSendAlreadyInFlightError,
		XrpSendNotGuardedError,
		type XrpPaymentRefusal
	} from '$xrp/types/xrp-send';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
	import { isXrpAmountSendable } from '$xrp/utils/xrp-send.utils';
	import {
		fitsXrpTokenPrecision,
		getXrpTokenMaxAmount,
		isTokenXrpTrustLine
	} from '$xrp/utils/xrp-trust-line.utils';

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
		onSendForm: () => void;
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
		onSendForm,
		onTokensList
	}: Props = $props();

	const { sendToken, sendTokenDecimals, sendXrpDestinationTag, sendBalance } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let networkId = $derived($sendToken?.network.id);

	let source = $derived($xrpAddressMainnet);

	/**
	 * Fee context store
	 */

	const feeStore = initFeeStore();
	const reserveStore = initReserveStore();
	const transferRateStore = initTransferRateStore();

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
			reserveStore,
			transferRateStore,
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

	// Where each refusal of a token payment, or of an XRP payment to an account with DepositAuth, is
	// corrected: the amount on the form, the recipient on the destination step, or the review, which
	// shows a changed transfer fee once it reloads.
	const refusalCorrection = (
		refusal: XrpPaymentRefusal
	): { text: string; step: 'form' | 'destination' | 'review' } => {
		const withSymbol = (text: string): string =>
			replacePlaceholders(text, { $symbol: $sendToken?.symbol ?? '' });

		switch (refusal) {
			case 'imprecise_amount':
				return { text: $i18n.send.assertion.xrp_token_amount_too_precise, step: 'form' };
			case 'insufficient_token_balance':
				return { text: withSymbol($i18n.send.error.xrp_token_insufficient_balance), step: 'form' };
			case 'insufficient_xrp_for_fee':
				return { text: $i18n.send.error.xrp_insufficient_xrp_for_fee, step: 'form' };
			case 'trust_line_limit':
				return { text: withSymbol($i18n.send.error.xrp_trust_line_limit), step: 'form' };
			case 'destination_not_found':
				return { text: $i18n.send.error.xrp_destination_not_found, step: 'destination' };
			case 'deposit_not_authorized':
				return { text: $i18n.send.error.xrp_deposit_not_authorized, step: 'destination' };
			case 'no_trust_line':
				return { text: withSymbol($i18n.send.error.xrp_no_trust_line), step: 'destination' };
			case 'destination_frozen':
				return { text: withSymbol($i18n.send.error.xrp_destination_frozen), step: 'destination' };
			case 'destination_not_authorized':
				return {
					text: withSymbol($i18n.send.error.xrp_destination_not_authorized),
					step: 'destination'
				};
			case 'frozen':
				return { text: withSymbol($i18n.send.error.xrp_token_frozen), step: 'destination' };
			case 'deep_frozen':
				return { text: withSymbol($i18n.send.error.xrp_token_deep_frozen), step: 'destination' };
			case 'no_rippling':
				return { text: withSymbol($i18n.send.error.xrp_no_rippling), step: 'destination' };
			case 'transfer_rate_changed':
				return { text: withSymbol($i18n.send.error.xrp_transfer_fee_changed), step: 'review' };
			case 'state_unavailable':
				return { text: $i18n.send.error.xrp_ledger_state_unavailable, step: 'review' };
			default:
				return assertNever(refusal, `Unknown XRP payment refusal: ${refusal}`);
		}
	};

	const send = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		const network = nonNullish(networkId) ? mapNetworkIdToNetwork(networkId) : undefined;

		if (isNullish(networkId) || !isNetworkIdXrp(networkId) || isNullish(network)) {
			toastsError({
				// `NetworkId` is a branded symbol, so it cannot go into a template literal — that
				// throws rather than printing. `.description` is how the rest of the file reads one.
				msg: {
					text: replacePlaceholders($i18n.send.error.no_xrp_network_id, {
						$networkId: networkId?.description ?? ''
					})
				}
			});
			return;
		}

		// Was `assertNonNullish`, which throws out of this handler — outside the try below — so an
		// address that had not derived produced an unhandled rejection: no toast, no progress, a
		// Send button that did nothing. `SendModal` now gates XRP on `xrpAddressMainnetNotLoaded`
		// like the other chains, so this should be unreachable; it fails closed and says so rather
		// than trusting that, since the address can also go away while the wizard is open.
		if (isNullish(source)) {
			toastsError({
				msg: { text: $i18n.send.error.xrp_account_state_unavailable }
			});
			return;
		}

		if (isNullishOrEmpty(destination)) {
			toastsError({
				msg: { text: $i18n.send.assertion.destination_address_invalid }
			});
			return;
		}

		// Same treatment as its counterpart below, which judges the parsed base units rather than the
		// string: both report an amount the user has to retype, and only the form can take it.
		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});

			onSendForm();

			return;
		}

		if (isNullish($sendToken)) {
			toastsError({
				msg: { text: $i18n.tokens.error.unexpected_undefined }
			});
			return;
		}

		// `tryParseToken`, not `parseToken`: this runs outside the try below, and `parseToken` throws
		// for an amount `invalidAmount` accepts — `1e400` overflows, a sub-drop value has too many
		// decimals — which would reject out of the click handler instead of showing the error.
		const amountUnits = tryParseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		});

		// A trust-line token is measured in the token, against what its balance can send once the
		// issuer's transfer fee is paid — none on a payment to the issuer itself.
		const trustLineToken = isTokenXrpTrustLine($sendToken) ? $sendToken : undefined;

		const transferRate = isNullish(trustLineToken)
			? undefined
			: destination === trustLineToken.issuer
				? XRP_TRANSFER_RATE_NO_FEE
				: $transferRateStore;

		// One guard for both, because they are the same mistake seen twice: `invalidAmount` and the
		// review step accept an amount the ledger cannot take, and the form's own rejection of it is
		// debounced — which leaves a window where Next is still enabled. This is the last point
		// before signing, and it judges the base units actually being signed rather than the string
		// that produced them.
		if (isNullish(amountUnits) || amountUnits === ZERO) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});

			// Like the sendability check below and the typed refusals further down: this runs before
			// `onNext`, so the user is on REVIEW, and an invalid amount can only be corrected on the
			// form. This guard exists because input validation is debounced, which is exactly how a
			// value the field has not rejected yet reaches review.
			onSendForm();

			return;
		}

		// Separate from the funds check below, because a missing figure is not a shortfall — no
		// comparison happened at all. The form gates all three, so reaching here means one went
		// missing after it, most plainly a balance reload that failed while the user was on review.
		// Telling them to lower the amount cannot fix that, and it is the last thing the wallet says
		// before giving up.
		//
		// The reviewed fee is required, not defaulted: a nullish one means nothing was priced, and
		// the same value is both checked here and signed below.
		if (isNullish($sendBalance) || isNullish($reserveStore) || isNullish($feeStore)) {
			toastsError({
				msg: { text: $i18n.send.error.xrp_account_state_unavailable }
			});
			return;
		}

		if (nonNullish(trustLineToken)) {
			if (isNullish(transferRate)) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_ledger_state_unavailable }
				});
				return;
			}

			const tokenRefusal = !fitsXrpTokenPrecision(amountUnits)
				? $i18n.send.assertion.xrp_token_amount_too_precise
				: amountUnits > getXrpTokenMaxAmount({ balance: $sendBalance, transferRate })
					? transferRate > XRP_TRANSFER_RATE_NO_FEE
						? $i18n.send.assertion.xrp_insufficient_funds_for_transfer_fee
						: $i18n.send.assertion.insufficient_funds
					: undefined;

			if (nonNullish(tokenRefusal)) {
				toastsError({ msg: { text: tokenRefusal } });

				onSendForm();

				return;
			}
		}

		// The form validated the amount against the fee and reserve as they stood when it was
		// typed. `TokenInputContent` now reruns that check when they change, but only while the form
		// is on screen — the review step has no input to revalidate, so the poller can still raise
		// what the account must retain underneath an amount that was accepted. Re-assert it here,
		// which is the last point before signing.
		if (
			isNullish(trustLineToken) &&
			!isXrpAmountSendable({
				amount: amountUnits,
				balance: $sendBalance,
				fee: $feeStore,
				reserve: $reserveStore
			})
		) {
			toastsError({
				msg: { text: $i18n.send.assertion.insufficient_funds_for_reserve }
			});

			// Same reason as the typed pre-sign refusals below: this runs before `onNext`, so the
			// user is on REVIEW, and the message names an amount that only the form can change. The
			// trigger is exactly a figure moving while they sit on review, which is what this check
			// exists to catch.
			onSendForm();

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
				amount: amountUnits,
				fee: $feeStore,
				destinationTag: $sendXrpDestinationTag,
				token: $sendToken,
				transferRate
			});

			// Submitted, not settled — so nothing here claims the payment arrived. The success and
			// failure events, and the toast that reports the real outcome, fire from the record's
			// terminal side effects in `LoaderActiveUserTransactions`, which is the only place that
			// knows what the ledger decided.
			toastsShow({
				text: $i18n.send.text.xrp_submitted,
				level: 'info',
				duration: 4000
			});

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			// Only pre-broadcast failures reach here now, so the event is unambiguous: this send did
			// not happen. A payment that IS on the wire reports from the record instead.
			trackEvent({
				name: TRACK_COUNT_XRP_SEND_ERROR,
				metadata: sendTrackingEventMetadata
			});

			// Pre-sign refusals, and the reason they are matched before the generic branch: each fires
			// while progress is still INITIALIZATION, so nothing was signed and nothing left the
			// wallet. They exist to spare the user a `tec` that claims the fee and burns the sequence,
			// which makes "unexpected error" the opposite of what happened — the wallet worked, and
			// the send is correctable.
			//
			// `onSendForm` rather than `onBack`, because each message names a field to change and
			// only the form has them. `onNext` already ran before the await, so this is caught on
			// SENDING and one step back is REVIEW — advice the user could follow only after pressing
			// back a second time.
			const correctOnForm = (text: string) => {
				toastsError({ msg: { text }, err });

				onSendForm();
			};

			// The two refusals no field can fix: a payment from this address has not resolved yet, or
			// the wallet could not establish whether one has. Both come before the broadcast — the
			// gate's before any node read or signature, the record's after signing, when the backend
			// refuses it or it cannot be written — so nothing left the wallet. No override is offered
			// for the in-flight case, because while the first payment is open there is no sequence a
			// second one could safely take.
			if (err instanceof XrpSendAlreadyInFlightError) {
				toastsError({ msg: { text: $i18n.send.error.xrp_send_already_in_flight }, err });

				onBack();

				return;
			}

			if (err instanceof XrpSendNotGuardedError) {
				toastsError({ msg: { text: $i18n.send.error.xrp_send_not_guarded }, err });

				onBack();

				return;
			}

			// The one pre-sign refusal the form cannot fix: no amount makes a payment to yourself
			// deliverable, so it goes back to where the recipient is chosen. `onSendBack` already
			// targets that step.
			if (err instanceof XrpSelfDestinationError) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_destination_is_source },
					err
				});

				onSendBack();

				return;
			}
			if (err instanceof XrpAmountExceedsSendableError) {
				correctOnForm($i18n.send.error.xrp_amount_exceeds_sendable);

				return;
			}

			if (err instanceof XrpDestinationUnfundedError) {
				correctOnForm(
					replacePlaceholders($i18n.send.error.xrp_destination_unfunded, {
						$reserve: formatToken({
							value: XRP_BASE_RESERVE_DROPS,
							unitName: $sendTokenDecimals
						})
					})
				);

				return;
			}

			if (err instanceof XrpDestinationTagRequiredError) {
				correctOnForm($i18n.send.error.xrp_destination_tag_required);

				return;
			}

			if (err instanceof XrpPaymentRefusedError) {
				const { text, step } = refusalCorrection(err.refusal);

				toastsError({ msg: { text }, err });

				if (step === 'form') {
					onSendForm();
				} else if (step === 'destination') {
					onSendBack();
				} else {
					onBack();
				}

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

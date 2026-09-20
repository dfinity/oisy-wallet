<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import InProgressWizard from '$lib/components/ui/InProgressWizard.svelte';
	import {
		TRACK_COUNT_XRP_SEND_ERROR,
		TRACK_COUNT_XRP_SEND_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
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
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkIdXrp } from '$lib/utils/network.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
	import XrpSendForm from '$xrp/components/send/XrpSendForm.svelte';
	import XrpSendReview from '$xrp/components/send/XrpSendReview.svelte';
	import { sendSteps } from '$xrp/constants/steps.constants';
	import { XRP_BASE_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
	import { sendXrp } from '$xrp/services/xrp-send.services';
	import {
		initFeeStore,
		initReserveStore,
		initXrpFeeContext,
		XRP_FEE_CONTEXT_KEY,
		type XrpFeeContext as XrpFeeContextType
	} from '$xrp/stores/xrp-fee.store';
	import {
		XrpAmountExceedsSendableError,
		XrpDestinationTagRequiredError,
		XrpDestinationUnfundedError,
		XrpSelfDestinationError,
		XrpSendExpiredError,
		XrpTransactionFailedError
	} from '$xrp/types/xrp-send';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
	import { isXrpAmountSendable } from '$xrp/utils/xrp-send.utils';

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

		// Same treatment as its counterpart below, which judges the parsed drops rather than the
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
		const amountDrops = tryParseToken({
			value: `${amount}`,
			unitName: $sendTokenDecimals
		});

		// One guard for both, because they are the same mistake seen twice: `invalidAmount` and the
		// review step accept an amount the ledger cannot take, and the form's own rejection of it is
		// debounced — which leaves a window where Next is still enabled. This is the last point
		// before signing, and it judges the drops actually being signed rather than the string that
		// produced them.
		if (isNullish(amountDrops) || amountDrops === ZERO) {
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

		// The form validated the amount against the fee and reserve as they stood when it was
		// typed. `TokenInputContent` now reruns that check when they change, but only while the form
		// is on screen — the review step has no input to revalidate, so the poller can still raise
		// what the account must retain underneath an amount that was accepted. Re-assert it here,
		// which is the last point before signing.
		if (
			!isXrpAmountSendable({
				amount: amountDrops,
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
				amount: amountDrops,
				fee: $feeStore,
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

			// Checked before the step, because a validated failure also happens at CONFIRM: the
			// outcome IS known there, so the indeterminate "we did not receive a confirmation"
			// advice would be wrong and would hide that the fee was charged.
			if (err instanceof XrpTransactionFailedError) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_transaction_failed },
					err
				});

				setTimeout(() => close(), 750);

				return;
			}

			// Definitive, and the opposite of the message below: the ledger passed the transaction's
			// LastLedgerSequence without including it, so nothing was sent and a new one is safe.
			// Reporting that as "we don't know" would leave the user stuck on a settled outcome.
			if (err instanceof XrpSendExpiredError) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_send_expired },
					err
				});

				setTimeout(() => close(), 750);

				return;
			}

			if (sendProgressStep === ProgressStepsSendXrp.CONFIRM) {
				toastsError({
					msg: { text: $i18n.send.error.xrp_confirmation_failed },
					err
				});

				setTimeout(() => close(), 750);

				return;
			}

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

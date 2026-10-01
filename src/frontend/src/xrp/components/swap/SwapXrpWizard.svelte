<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
	import type { ProgressStep } from '$eth/types/send';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUBMITTED
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { xrpAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
	import { fetchNearIntentsXrpSwap } from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider } from '$lib/types/swap';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { tryParseToken } from '$lib/utils/parse.utils';
	import { nearIntentsQuoteRejectedMessage } from '$lib/utils/swap.utils';
	import XrpFeeContext from '$xrp/components/fee/XrpFeeContext.svelte';
	import SwapXrpFees from '$xrp/components/swap/SwapXrpFees.svelte';
	import SwapXrpForm from '$xrp/components/swap/SwapXrpForm.svelte';
	import {
		initFeeStore,
		initReserveStore,
		initXrpFeeContext,
		XRP_FEE_CONTEXT_KEY,
		type XrpFeeContext as XrpFeeContextType
	} from '$xrp/stores/xrp-fee.store';
	import {
		XrpAmountExceedsSendableError,
		XrpSendAlreadyInFlightError,
		XrpSendNotGuardedError
	} from '$xrp/types/xrp-send';
	import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
	import { isXrpAmountSendable } from '$xrp/utils/xrp-send.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStep;
		currentStep?: WizardStep;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
		onStopTriggerAmount: () => void;
		onStartTriggerAmount: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		currentStep,
		isSwapAmountsLoading,
		onStopTriggerAmount,
		onStartTriggerAmount,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance, sourceTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore.selectedProvider.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

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

	let sourceTokenUsdValue = $derived(
		nonNullish($sourceTokenExchangeRate) && nonNullish($sourceToken) && nonNullish(swapAmount)
			? `${Number(swapAmount) * $sourceTokenExchangeRate}`
			: undefined
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		swapProgressStep = ProgressStepsSwap.INITIALIZATION;

		const network = nonNullish($sourceToken)
			? mapNetworkIdToNetwork($sourceToken.network.id)
			: undefined;

		const source = $xrpAddressMainnet;

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(swapAmount) ||
			isNullish(network) ||
			isNullish(source) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
			return;
		}

		// `tryParseToken`, not `parseToken`: this runs outside the try below, and an amount the ledger
		// cannot express would otherwise reject out of the click handler instead of showing an error.
		const amount = tryParseToken({ value: `${swapAmount}`, unitName: $sourceToken.decimals });

		// Each refusal before `onNext` names the amount, and one step back from Review is the form,
		// the only place it can change.
		if (isNullish(amount) || amount === ZERO) {
			toastsError({ msg: { text: $i18n.send.assertion.amount_invalid } });

			onBack();

			return;
		}

		// Read once: the check below and the signature must judge the same figures, and the fee
		// poller can move them. The fee is signed as reviewed, never defaulted.
		const fee = $feeStore;
		const reserve = $reserveStore;
		const balance = $sourceTokenBalance;

		// A figure that went missing after the form is not a shortfall, so lowering the amount cannot
		// fix it — most plainly Review's own fee context, rebuilt with the step, not loaded yet.
		if (isNullish(balance) || isNullish(fee) || isNullish(reserve)) {
			toastsError({ msg: { text: $i18n.send.error.xrp_account_state_unavailable } });

			return;
		}

		// The form judged the amount against the figures as they stood on the form; Review has no input
		// to judge it again as they move.
		if (!isXrpAmountSendable({ amount, balance, fee, reserve })) {
			toastsError({ msg: { text: $i18n.send.assertion.insufficient_funds_for_reserve } });

			onBack();

			return;
		}

		const swapTrackingMetadata = {
			sourceToken: $sourceToken.symbol,
			destinationToken: $destinationToken.symbol,
			dApp: $swapAmountsStore.selectedProvider.provider,
			usdSourceValue: sourceTokenUsdValue ?? '',
			swapType: $swapAmountsStore.selectedProvider.type ?? '',
			sourceNetwork: $sourceToken.network.name,
			destinationNetwork: $destinationToken.network.name
		};

		onNext();
		onStopTriggerAmount();

		const { selectedProvider } = $swapAmountsStore;

		try {
			if (
				selectedProvider?.provider === SwapProvider.NEAR_INTENTS &&
				!$hasAcknowledgedNearIntentsSwap
			) {
				// To be conservative on the legal side, we only allow the swap if persisting
				// the provider agreement succeeds. If it fails we abort, since the user must
				// explicitly accept the ToS before funds move through a third-party provider.
				try {
					await acceptProviderAgreement({
						identity: $authIdentity,
						currentUserVersion: $userProfileVersion
					});
				} catch (err) {
					toastsError({
						msg: { text: $i18n.swap.error.cannot_save_provider_agreement },
						err
					});

					onBack();

					onStartTriggerAmount();

					return;
				}
			}

			await fetchNearIntentsXrpSwap({
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken,
				destinationToken: $destinationToken,
				swapAmount,
				swapDetails: selectedProvider.swapDetails as NearIntentsQuoteResponse,
				userAddress: source,
				network,
				fee
			});

			progress(ProgressStepsSwap.DONE);

			// The foreground ends once the deposit is submitted. The swap's row resolves the deposit on
			// the ledger and then follows 1Click to the outcome, firing the success or failure event
			// when it is terminal. Hence `submitted`.
			trackEvent({
				name: TRACK_COUNT_SWAP_SUBMITTED,
				metadata: swapTrackingMetadata
			});

			setTimeout(() => {
				try {
					onClose();
				} catch (_: unknown) {
					toastsError({
						msg: { text: $i18n.swap.error.swap_completed_close_failed }
					});
				}
			}, 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					...swapTrackingMetadata,
					error: errorDetailToString(err) ?? ''
				}
			});

			// The refusals `sendXrp` makes before the broadcast, so nothing left the wallet. A payment
			// from this address has not resolved yet, or the wallet could not establish whether one has:
			// no field fixes either, so they go back to Review, like any other failure.
			if (err instanceof XrpSendAlreadyInFlightError) {
				toastsError({ msg: { text: $i18n.send.error.xrp_send_already_in_flight }, err });

				onBack();
				onStartTriggerAmount();

				return;
			}

			if (err instanceof XrpSendNotGuardedError) {
				toastsError({ msg: { text: $i18n.send.error.xrp_send_not_guarded }, err });

				onBack();
				onStartTriggerAmount();

				return;
			}

			// The ledger's figures, which `sendXrp` reads again, no longer leave room for the amount. The
			// message names the amount, which only the form can change, and `onNext` has already moved
			// to SWAPPING, one step past Review — so two steps back.
			if (err instanceof XrpAmountExceedsSendableError) {
				toastsError({ msg: { text: $i18n.send.error.xrp_amount_exceeds_sendable }, err });

				onBack();
				onBack();
				onStartTriggerAmount();

				return;
			}

			const quoteRejected = nearIntentsQuoteRejectedMessage(err);

			toastsError({
				msg: { text: quoteRejected ?? $i18n.swap.error.unexpected },
				// The gate aborted before any funds moved, so there is no underlying failure to
				// attach; the message above already says everything the user needs.
				...(isNullish(quoteRejected) ? { err } : {})
			});

			onBack();
			onStartTriggerAmount();
		}
	};
</script>

{#if nonNullish($sourceToken)}
	<XrpFeeContext observe={currentStep?.name !== WizardStepsSwap.SWAPPING} token={$sourceToken}>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsSwap.SWAP}
				<SwapXrpForm
					{isSwapAmountsLoading}
					{onClose}
					{onNext}
					{onShowProviderList}
					{onShowTokensList}
					bind:swapAmount
					bind:receiveAmount
					bind:slippageValue
				/>
			{:else if currentStep?.name === WizardStepsSwap.REVIEW}
				<SwapReview
					isSwapAmountsLoading={isSwapAmountsLoading &&
						receiveAmount !== $swapAmountsStore?.selectedProvider?.receiveAmount}
					{onBack}
					onSwap={swap}
					{receiveAmount}
					{slippageValue}
					{swapAmount}
				>
					{#snippet swapFees()}
						<SwapXrpFees />
					{/snippet}
				</SwapReview>
			{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
				<SwapProgress sendWithTransfer {swapProgressStep} swapWithActiveTransaction />
			{/if}
		{/key}
	</XrpFeeContext>
{/if}

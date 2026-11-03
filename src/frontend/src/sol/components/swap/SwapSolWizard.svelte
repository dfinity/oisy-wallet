<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext, untrack } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import type { ProgressStep } from '$eth/types/send';
	import InsufficientFundsForFee from '$lib/components/fee/InsufficientFundsForFee.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUBMITTED
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import {
		SWAP_LIFI_INSUFFICIENT_FUNDS_FOR_FEE,
		SWAP_LIFI_UNVERIFIED_ROUTE
	} from '$lib/constants/test-ids.constants';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { fetchLifiSolSwap } from '$lib/services/lifi-sol-swap.services';
	import { lifiSolQuoteCallsUnpinnedProgram } from '$lib/services/lifi-sol-transaction.services';
	import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
	import { fetchNearIntentsSolSwap } from '$lib/services/swap.services';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { LifiSolFeeChangedError } from '$lib/types/errors';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapProvider } from '$lib/types/swap';
	import type { TokenId } from '$lib/types/token';
	import type { WizardStep } from '$lib/types/wizard';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isLifiFeeAffordable, raiseLifiMaxFee } from '$lib/utils/lifi-fee.utils';
	import { toLifiSwapErrorType } from '$lib/utils/lifi-swap-error.utils';
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import { nearIntentsQuoteRejectedMessage } from '$lib/utils/swap.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import SwapSolFees from '$sol/components/swap/SwapSolFees.svelte';
	import SwapSolForm from '$sol/components/swap/SwapSolForm.svelte';
	import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
	import {
		SOL_FEE_CONTEXT_KEY,
		type FeeContext as FeeContextType,
		initFeeContext,
		initFeeStore
	} from '$sol/stores/sol-fee.store';
	import { mapSolanaErrorMsg } from '$sol/utils/sol-error.utils';

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

	const {
		sourceToken,
		destinationToken,
		failedSwapError,
		sourceTokenExchangeRate,
		lifiCarriedFee,
		amountSetToMax,
		lifiMaxFee
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	$effect(() => {
		receiveAmount =
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
				? formatTokenBigintToNumber({
						value: $swapAmountsStore?.selectedProvider?.receiveAmount,
						unitName: $destinationToken.decimals,
						displayDecimals: $destinationToken.decimals
					})
				: undefined;
	});

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

	let solanaNativeToken = $derived(
		isNetworkIdSOLDevnet($sourceToken?.network.id)
			? SOLANA_DEVNET_TOKEN
			: isNetworkIdSOLLocal($sourceToken?.network.id)
				? SOLANA_LOCAL_TOKEN
				: SOLANA_TOKEN
	);

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

	let sourceTokenUsdValue = $derived(
		nonNullish($sourceTokenExchangeRate) && nonNullish($sourceToken) && nonNullish(swapAmount)
			? `${Number(swapAmount) * $sourceTokenExchangeRate}`
			: undefined
	);

	const lifiOffer = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.LIFI
			? $swapAmountsStore.selectedProvider
			: undefined
	);

	const isLifiProvider = $derived(nonNullish(lifiOffer));

	// What a ceiling carried back from a refused execution is kept for: the inputs of the quote, as
	// its cache keys them.
	const lifiInputsKey = $derived(
		nonNullish(lifiOffer) ? JSON.stringify(lifiOffer.request) : undefined
	);

	// The LI.FI ceiling the form and the review price the swap at, and execution holds its own to: the
	// displayed quote's, or a higher one an execution found for the same inputs.
	const lifiFee = $derived.by(() => {
		const quoted = lifiOffer?.solFeeCeiling;
		const carriedFee = $lifiCarriedFee;

		const carried =
			nonNullish(carriedFee) && carriedFee.key === lifiInputsKey && 'solCeiling' in carriedFee
				? carriedFee.solCeiling
				: undefined;

		return nonNullish(quoted) && nonNullish(carried) && carried > quoted ? carried : quoted;
	});

	// Checked against the balance as the form checks it: a carried ceiling may not fit.
	const isLifiFeeUnaffordable = $derived(
		nonNullish(lifiOffer) &&
			nonNullish(lifiFee) &&
			!isLifiFeeAffordable({
				fee: lifiFee,
				amount: BigInt(lifiOffer.request.fromAmount),
				isNativeSource: lifiOffer.request.fromToken === SYSTEM_PROGRAM_ADDRESS,
				nativeBalance: $balancesStore?.[solanaNativeToken.id]?.data ?? ZERO
			})
	);

	// A review that cannot fit its ceiling raises what "Max" from SOL leaves room for, as on EVM: back
	// on the form, the amount then steps down to one that fits.
	$effect(() => {
		const fee = lifiFee;
		const destinationTokenId = $destinationToken?.id;

		if (
			currentStep?.name !== WizardStepsSwap.REVIEW ||
			!isLifiFeeUnaffordable ||
			!$amountSetToMax ||
			lifiOffer?.request.fromToken !== SYSTEM_PROGRAM_ADDRESS ||
			isNullish(fee) ||
			isNullish(destinationTokenId)
		) {
			return;
		}

		untrack(() => {
			const reserved = raiseLifiMaxFee({ reserved: $lifiMaxFee, fee, destinationTokenId });

			if (reserved !== $lifiMaxFee) {
				lifiMaxFee.set(reserved);
			}
		});
	});

	// Whether the displayed quote's transaction calls a program the binding does not pin, read at the
	// review for each quote it shows, and `undefined` while it is read. A simulation that gives no
	// answer lets the review confirm: the binding checks the transaction signed all the same.
	let lifiCallsUnpinnedProgram = $state<boolean | undefined>();
	let lifiProgramsGeneration = 0;

	const lifiQuoteTransaction = $derived(lifiOffer?.swapDetails.transactionRequest?.data);

	$effect(() => {
		[lifiQuoteTransaction, currentStep?.name, $solAddressMainnet];

		untrack(() => {
			const generation = ++lifiProgramsGeneration;
			const quote = lifiOffer?.swapDetails;
			const userAddress = $solAddressMainnet;

			lifiCallsUnpinnedProgram = undefined;

			if (
				currentStep?.name !== WizardStepsSwap.REVIEW ||
				isNullish(quote) ||
				isNullish(userAddress)
			) {
				return;
			}

			lifiSolQuoteCallsUnpinnedProgram({ quote, userAddress })
				.catch(() => undefined)
				.then((calls) => {
					if (generation === lifiProgramsGeneration) {
						lifiCallsUnpinnedProgram = calls === true;
					}
				});
		});
	});

	// The review confirms a LI.FI swap only once its ceiling fits and its route is not refused.
	const isLifiReviewBlocked = $derived(
		isLifiProvider &&
			(isNullish(lifiFee) || isLifiFeeUnaffordable || lifiCallsUnpinnedProgram !== false)
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		swapProgressStep = ProgressStepsSwap.INITIALIZATION;

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(slippageValue) ||
			isNullish(swapAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.receiveAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider) ||
			isNullish($solAddressMainnet)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
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
			failedSwapError.set(undefined);

			if (selectedProvider?.provider === SwapProvider.NEAR_INTENTS) {
				if (!$hasAcknowledgedNearIntentsSwap) {
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

				await fetchNearIntentsSolSwap({
					identity: $authIdentity,
					progress: (step: ProgressStep) => (swapProgressStep = step),
					sourceToken: $sourceToken,
					destinationToken: $destinationToken,
					swapAmount,
					userAddress: $solAddressMainnet,
					swapDetails: selectedProvider.swapDetails
				});
			} else if (selectedProvider?.provider === SwapProvider.LIFI && nonNullish(lifiFee)) {
				await fetchLifiSolSwap({
					identity: $authIdentity,
					progress: (step: ProgressStep) => (swapProgressStep = step),
					sourceToken: $sourceToken,
					destinationToken: $destinationToken,
					swapAmount,
					userAddress: $solAddressMainnet,
					offer: selectedProvider,
					reviewedCeiling: lifiFee
				});
			} else {
				toastsError({
					msg: { text: $i18n.swap.error.unexpected }
				});

				onBack();
				onStartTriggerAmount();

				return;
			}

			progress(ProgressStepsSwap.DONE);

			// The foreground completes once the user's funds have left their wallet;
			// success/failure of the background settlement is tracked separately via
			// the AUT store, so we fire `submitted` here (matching OneSec).
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
			const errorDetail = errorDetailToString(err);

			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					...swapTrackingMetadata,
					// LI.FI's error text can carry the user's address or signed transaction: only an
					// allow-listed category is reported.
					...(selectedProvider?.provider === SwapProvider.LIFI
						? { result_error_type: toLifiSwapErrorType(err) }
						: { error: errorDetail ?? '' })
				}
			});

			if (err instanceof LifiSolFeeChangedError) {
				// Carried back to the review, which shows the higher ceiling for the user to confirm.
				if (nonNullish(lifiInputsKey)) {
					lifiCarriedFee.set({ key: lifiInputsKey, solCeiling: err.ceiling });
				}

				failedSwapError.set({
					message: $i18n.swap.error.lifi_fee_changed,
					variant: 'info'
				});
			} else if (
				selectedProvider?.provider === SwapProvider.LIFI &&
				nonNullish(errorDetail) &&
				errorDetail.startsWith('Slippage exceeded.')
			) {
				failedSwapError.set({
					message: replacePlaceholders(
						replaceOisyPlaceholders($i18n.swap.error.slippage_exceeded),
						{
							$maxSlippage: slippageValue.toString()
						}
					),
					variant: 'info'
				});
			} else {
				failedSwapError.set(undefined);

				const quoteRejected = nearIntentsQuoteRejectedMessage(err);

				toastsError({
					msg: { text: quoteRejected ?? mapSolanaErrorMsg(err) ?? $i18n.swap.error.unexpected },
					// The gate aborted before any funds moved, so there is no underlying failure to
					// attach; the message above already says everything the user needs.
					...(isNullish(quoteRejected) ? { err } : {})
				});
			}

			onBack();
			onStartTriggerAmount();
		}
	};
</script>

{#if nonNullish($sourceToken)}
	<SolFeeContext observe={currentStep?.name !== WizardStepsSwap.SWAPPING} token={$sourceToken}>
		{#key currentStep?.name}
			{#if currentStep?.name === WizardStepsSwap.SWAP}
				<SwapSolForm
					isLifi={isLifiProvider}
					{isSwapAmountsLoading}
					{lifiFee}
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
					swapDisabled={isLifiReviewBlocked}
				>
					{#snippet swapFees()}
						<SwapSolFees isLifi={isLifiProvider} {lifiFee} />

						{#if isLifiFeeUnaffordable}
							<InsufficientFundsForFee testId={SWAP_LIFI_INSUFFICIENT_FUNDS_FOR_FEE} />
						{:else if isLifiProvider && lifiCallsUnpinnedProgram === true}
							<div data-tid={SWAP_LIFI_UNVERIFIED_ROUTE}>
								<MessageBox level="error">
									{replaceOisyPlaceholders($i18n.swap.error.lifi_route_unverified)}
								</MessageBox>
							</div>
						{/if}
					{/snippet}
				</SwapReview>
			{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
				<SwapProgress
					sendWithTransfer={!isLifiProvider}
					{swapProgressStep}
					swapWithActiveTransaction
				/>
			{/if}
		{/key}
	</SolFeeContext>
{/if}

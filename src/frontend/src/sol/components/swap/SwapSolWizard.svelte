<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		SOLANA_DEVNET_TOKEN,
		SOLANA_LOCAL_TOKEN,
		SOLANA_TOKEN
	} from '$env/tokens/tokens.sol.env';
	import type { ProgressStep } from '$eth/types/send';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { hasAcknowledgedNearIntentsSwap } from '$lib/derived/user-provider-agreements.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { acceptProviderAgreement } from '$lib/services/provider-agreements.services';
	import { fetchNearIntentsSolSwap } from '$lib/services/swap.services';
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
	import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
	import SolFeeContext from '$sol/components/fee/SolFeeContext.svelte';
	import SwapSolFees from '$sol/components/swap/SwapSolFees.svelte';
	import SwapSolForm from '$sol/components/swap/SwapSolForm.svelte';
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

	const { sourceToken, destinationToken, failedSwapError, sourceTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

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
			}

			await fetchNearIntentsSolSwap({
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken,
				destinationToken: $destinationToken,
				swapAmount,
				userAddress: $solAddressMainnet,
				swapDetails: selectedProvider.swapDetails as NearIntentsQuoteResponse
			});

			progress(ProgressStepsSwap.DONE);

			trackEvent({
				name: TRACK_COUNT_SWAP_SUCCESS,
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

			failedSwapError.set(undefined);

			toastsError({
				msg: { text: mapSolanaErrorMsg(err) ?? $i18n.swap.error.unexpected },
				err
			});

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
						<SwapSolFees />
					{/snippet}
				</SwapReview>
			{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
				<SwapProgress sendWithTransfer {swapProgressStep} />
			{/if}
		{/key}
	</SolFeeContext>
{/if}

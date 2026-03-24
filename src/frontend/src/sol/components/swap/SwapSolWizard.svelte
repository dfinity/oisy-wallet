<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import type { ProgressStep } from '$eth/types/send';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { solAddressMainnet } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
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
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { formatToken, formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { parseToken } from '$lib/utils/parse.utils';

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
		sourceTokenBalance
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

	let errorType = $state<TokenActionErrorType | undefined>();

	const customValidate = (userAmount: bigint): TokenActionErrorType | undefined => {
		if (isNullish($sourceToken)) {
			return;
		}

		const parsedSendBalance = nonNullish($sourceTokenBalance)
			? parseToken({
					value: formatToken({
						value: $sourceTokenBalance,
						unitName: $sourceToken.decimals,
						displayDecimals: $sourceToken.decimals
					}),
					unitName: $sourceToken.decimals
				})
			: ZERO;

		if (userAmount > parsedSendBalance) {
			return 'insufficient-funds';
		}
	};

	$effect(() => {
		if (nonNullish($sourceToken) && nonNullish(swapAmount)) {
			const parsedAmount = parseToken({
				value: `${swapAmount}`,
				unitName: $sourceToken.decimals
			});

			const newErrorType = customValidate(parsedAmount);
			if (newErrorType !== errorType) {
				errorType = newErrorType;
			}
		}
	});

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

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

			await fetchNearIntentsSolSwap({
				identity: $authIdentity,
				progress: (step: ProgressStep) => (swapProgressStep = step),
				sourceToken: $sourceToken,
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
				msg: { text: $i18n.swap.error.unexpected },
				err
			});

			onBack();
			onStartTriggerAmount();
		}
	};
</script>

{#if nonNullish($sourceToken)}
	{#key currentStep?.name}
		{#if currentStep?.name === WizardStepsSwap.SWAP}
			<SwapForm
				{errorType}
				{isSwapAmountsLoading}
				{onClose}
				onCustomValidate={customValidate}
				{onNext}
				{onShowTokensList}
				bind:swapAmount
				bind:receiveAmount
				bind:slippageValue
			>
				{#snippet swapDetails()}
					{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
						<Hr spacing="md" />

						<div class="flex flex-col gap-3">
							<SwapProvider {onShowProviderList} showSelectButton {slippageValue} />
						</div>
					{/if}
				{/snippet}
			</SwapForm>
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
				{#snippet swapFees()}{/snippet}
			</SwapReview>
		{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
			<SwapProgress {swapProgressStep} />
		{/if}
	{/key}
{/if}

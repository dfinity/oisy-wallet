<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import IcTokenFeeContext from '$icp/components/fee/IcTokenFeeContext.svelte';
	import {
		IC_TOKEN_FEE_CONTEXT_KEY,
		type IcTokenFeeContext as IcTokenFeeContextType
	} from '$icp/stores/ic-token-fee.store';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import {
		TRACK_COUNT_SWAP_ERROR,
		TRACK_COUNT_SWAP_SUCCESS
	} from '$lib/constants/analytics.contants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { swapService } from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { SwapErrorCodes, SwapProvider } from '$lib/types/swap';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { isSwapError } from '$lib/utils/swap.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		swapProgressStep: string;
		currentStep: WizardStep | undefined;
	}
	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		swapProgressStep = $bindable<string>(),
		currentStep
	}: Props = $props();

	const { sourceToken, destinationToken, isSourceTokenIcrc2, failedSwapError } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { store: icTokenFeeStore } = getContext<IcTokenFeeContextType>(IC_TOKEN_FEE_CONTEXT_KEY);

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

	const dispatch = createEventDispatcher();

	let sourceTokenFee = $derived<bigint | undefined>(
		nonNullish($sourceToken) && nonNullish($icTokenFeeStore)
			? $icTokenFeeStore[$sourceToken.symbol]
			: undefined
	);

	const swap = async () => {
		if (isNullish($authIdentity)) {
			await nullishSignOut();
			return;
		}

		if (
			isNullish($sourceToken) ||
			isNullish($destinationToken) ||
			isNullish(slippageValue) ||
			isNullish(swapAmount) ||
			isNullish(sourceTokenFee) ||
			isNullish($swapAmountsStore?.selectedProvider?.receiveAmount) ||
			isNullish($swapAmountsStore?.selectedProvider?.provider)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
			return;
		}

		dispatch('icNext');

		try {
			failedSwapError.set(undefined);

			await swapService[$swapAmountsStore.selectedProvider.provider]({
				identity: $authIdentity,
				progress,
				sourceToken: $sourceToken,
				destinationToken: $destinationToken,
				swapAmount,
				receiveAmount: $swapAmountsStore.selectedProvider.receiveAmount,
				slippageValue,
				sourceTokenFee,
				isSourceTokenIcrc2: $isSourceTokenIcrc2,
				tryToWithdraw:
					nonNullish($failedSwapError?.errorType) &&
					($failedSwapError?.errorType === SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED ||
						$failedSwapError?.errorType === SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED ||
						$failedSwapError?.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED),
				withdrawDestinationTokens:
					nonNullish($failedSwapError?.errorType) &&
					$failedSwapError?.errorType === SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED
			});

			progress(ProgressStepsSwap.DONE);

			trackEvent({
				name: TRACK_COUNT_SWAP_SUCCESS,
				metadata: {
					sourceToken: $sourceToken.symbol,
					destinationToken: $destinationToken.symbol,
					dApp: $swapAmountsStore.selectedProvider.provider
				}
			});

			setTimeout(() => close(), 2500);
		} catch (err: unknown) {
			const errorDetail = errorDetailToString(err);
			// TODO: Add unit tests to cover failed swap error scenarios
			if (nonNullish(errorDetail) && errorDetail.startsWith('Slippage exceeded.')) {
				failedSwapError.set({
					message: replacePlaceholders(
						replaceOisyPlaceholders($i18n.swap.error.slippage_exceeded),
						{
							$maxSlippage: slippageValue.toString()
						}
					),
					variant: 'info'
				});
			}

			if (isSwapError(err)) {
				failedSwapError.set({
					message: err.message,
					variant: err.variant ?? 'info',
					errorType: err.code,
					url: {
						url: `https://app.icpswap.com/swap?input=${$sourceToken.ledgerCanisterId}&output=${$destinationToken.ledgerCanisterId}`,
						text: 'icpswap.com'
					}
				});
			} else {
				failedSwapError.set(undefined);
				toastsError({
					msg: { text: $i18n.swap.error.unexpected },
					err
				});
			}

			if (
				!(
					isSwapError(err) &&
					(err.code === SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS ||
						err.code === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED)
				)
			) {
				trackEvent({
					name: TRACK_COUNT_SWAP_ERROR,
					metadata: {
						sourceToken: $sourceToken.symbol,
						destinationToken: $destinationToken.symbol,
						dApp: $swapAmountsStore.selectedProvider.provider,
						errorKey: isSwapError(err) ? err.code : ''
					}
				});
			}

			setTimeout(() => back(), 2000);
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<IcTokenFeeContext token={$sourceToken}>
	<SwapAmountsContext
		amount={swapAmount}
		sourceToken={$sourceToken}
		destinationToken={$destinationToken}
		{slippageValue}
	>
		{#if currentStep?.name === WizardStepsSwap.SWAP}
			<SwapForm
				on:icClose
				on:icNext
				on:icShowTokensList
				on:icShowProviderList
				bind:swapAmount
				bind:receiveAmount
				bind:slippageValue
			/>
		{:else if currentStep?.name === WizardStepsSwap.REVIEW}
			<SwapReview on:icSwap={swap} on:icBack {slippageValue} {swapAmount} {receiveAmount} />
		{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
			<SwapProgress
				bind:swapProgressStep
				swapWithWithdrawing={$swapAmountsStore?.selectedProvider?.provider ===
					SwapProvider.ICP_SWAP}
			/>
		{/if}
	</SwapAmountsContext>
</IcTokenFeeContext>

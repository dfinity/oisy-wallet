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
	import { enI18n, i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { errorDetailToString } from '$lib/utils/error.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
	import { SwapError } from '$lib/services/swap-errors.services';
	import { SwapErrorCodes } from '$lib/types/swap';

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
				isSourceTokenIcrc2: $isSourceTokenIcrc2
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

			setTimeout(() => close(), 50);
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

			if (err instanceof SwapError) {
				if (err.code === SwapErrorCodes.WITHDRAW_FAILED) {
					failedSwapError.set({
						message: $i18n.swap.error.withdraw_failed,
						variant: 'error',
						url: {
							url: `https://app.icpswap.com/swap?input=${$sourceToken.ledgerCanisterId}&output=${$destinationToken.ledgerCanisterId}`,
							text: 'icpswap.com'
						}
					});
				} else {
					failedSwapError.set({
						message: $i18n.swap.error[err.code],
						variant: 'info'
					});
				}
			} else {
				failedSwapError.set(undefined);
				toastsError({
					msg: { text: $i18n.swap.error.unexpected },
					err
				});
			}

			trackEvent({
				name: TRACK_COUNT_SWAP_ERROR,
				metadata: {
					sourceToken: $sourceToken.symbol,
					destinationToken: $destinationToken.symbol,
					dApp: $swapAmountsStore.selectedProvider.provider,
					errorKey: err instanceof SwapError ? err.code : '',
					errorMessage: err instanceof SwapError ? enI18n().swap.error[err.code] : ''
				}
			});

			back();
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
			<SwapProgress bind:swapProgressStep />
		{/if}
	</SwapAmountsContext>
</IcTokenFeeContext>

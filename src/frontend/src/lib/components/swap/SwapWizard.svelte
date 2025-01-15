<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProgress from '$lib/components/swap/SwapProgress.svelte';
	import SwapReview from '$lib/components/swap/SwapReview.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { WizardStepsSwap } from '$lib/enums/wizard-steps';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { swap as swapService } from '$lib/services/swap.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let slippageValue: OptionAmount;
	export let swapProgressStep: string;
	export let currentStep: WizardStep | undefined;

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const progress = (step: ProgressStepsSwap) => (swapProgressStep = step);

	const dispatch = createEventDispatcher();

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
			isNullish($swapAmountsStore?.swapAmounts?.receiveAmount)
		) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected_missing_data }
			});
			return;
		}

		dispatch('icNext');

		try {
			await swapService({
				identity: $authIdentity,
				progress,
				sourceToken: $sourceToken,
				destinationToken: $destinationToken,
				swapAmount,
				receiveAmount: $swapAmountsStore.swapAmounts.receiveAmount,
				slippageValue
			});

			progress(ProgressStepsSwap.DONE);

			setTimeout(() => close(), 750);
		} catch (err: unknown) {
			toastsError({
				msg: { text: $i18n.swap.error.unexpected },
				err
			});

			back();
		}
	};

	const close = () => dispatch('icClose');
	const back = () => dispatch('icBack');
</script>

<SwapAmountsContext
	amount={swapAmount}
	sourceToken={$sourceToken}
	destinationToken={$destinationToken}
>
	{#if currentStep?.name === WizardStepsSwap.SWAP}
		<SwapForm
			on:icClose
			on:icNext
			on:icShowTokensList
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
		/>
	{:else if currentStep?.name === WizardStepsSwap.REVIEW}
		<SwapReview on:icSwap={swap} on:icBack {slippageValue} {swapAmount} {receiveAmount} />
	{:else if currentStep?.name === WizardStepsSwap.SWAPPING}
		<SwapProgress bind:swapProgressStep />
	{:else}
		<slot />
	{/if}
</SwapAmountsContext>

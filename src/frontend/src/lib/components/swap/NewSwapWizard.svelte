<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapEthWizard from '$eth/components/swap/SwapEthWizard.svelte';
	import SwapIcpWizard from '$icp/components/swap/SwapIcpWizard.svelte';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
	import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import { isNetworkIdICP } from '$lib/utils/network.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		swapProgressStep: ProgressStepsSwap;
		swapFailedProgressSteps?: ProgressStepsSwap[];
		currentStep?: WizardStep;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onClose: () => void;
		onNext: () => void;
		onBack: () => void;
	}
	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		swapProgressStep = $bindable(),
		swapFailedProgressSteps = $bindable(),
		currentStep,
		onShowTokensList,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sourceToken, destinationToken, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let isSwapAmountsLoading = $state(false);
</script>

<SwapAmountsContext
	amount={swapAmount}
	destinationToken={$destinationToken}
	isSourceTokenIcrc2={$isSourceTokenIcrc2}
	{slippageValue}
	sourceToken={$sourceToken}
	bind:isSwapAmountsLoading
>
	{#if isNullish($sourceToken) || isNetworkIdICP($sourceToken.network.id)}
		<SwapIcpWizard
			{currentStep}
			{isSwapAmountsLoading}
			{onBack}
			{onClose}
			{onNext}
			{onShowTokensList}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			on:icClose
			on:icShowTokensList
			on:icShowProviderList
			on:icNext
		/>
	{:else}
		<SwapEthWizard
			{currentStep}
			{isSwapAmountsLoading}
			{onBack}
			{onClose}
			{onNext}
			{onShowTokensList}
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			bind:swapProgressStep
			on:icClose
			on:icShowTokensList
			on:icShowProviderList
			on:icNext
		/>
	{/if}
</SwapAmountsContext>

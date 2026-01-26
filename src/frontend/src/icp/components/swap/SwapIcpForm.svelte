<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
		sourceTokenFee?: bigint;
		isSwapAmountsLoading: boolean;
		onShowTokensList: (tokenSource: 'source' | 'destination') => void;
		onShowProviderList: () => void;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		swapAmount = $bindable(),
		receiveAmount = $bindable(),
		slippageValue = $bindable(),
		sourceTokenFee,
		isSwapAmountsLoading,
		onShowTokensList,
		onShowProviderList,
		onClose,
		onNext
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let totalFee = $derived(
		nonNullish($isSourceTokenIcrc2)
			? (sourceTokenFee ?? ZERO) * ($isSourceTokenIcrc2 ? 2n : 1n)
			: undefined
	);

	const customValidate = (userAmount: bigint): TokenActionErrorType =>
		nonNullish($sourceToken)
			? validateUserAmount({
					userAmount,
					token: $sourceToken,
					balance: $sourceTokenBalance,
					fee: totalFee,
					isSwapFlow: true
				})
			: undefined;
</script>

<SwapForm
	{errorType}
	fee={totalFee}
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
				<SwapFees />
			</div>
		{/if}
	{/snippet}
</SwapForm>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapForm from '$lib/components/swap/SwapForm.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import { SwapProvider as SwapProviderType } from '$lib/types/swap';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';
	import { calculateValueDifference } from '$lib/utils/swap.utils';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { Html } from '@dfinity/gix-components';
	import { i18n } from '$lib/stores/i18n.store';

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

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	let errorType = $state<TokenActionErrorType | undefined>();

	let totalFee = $derived(
		nonNullish($isSourceTokenIcrc2)
			? (sourceTokenFee ?? ZERO) * ($isSourceTokenIcrc2 ? 2n : 1n)
			: undefined
	);

	let valueDifference = $derived(
		calculateValueDifference({
			swapAmount,
			receiveAmount,
			sourceTokenExchangeRate: $sourceTokenExchangeRate,
			destinationTokenExchangeRate: $destinationTokenExchangeRate
		})
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

	let isSlippageExceeded = $derived(
		nonNullish(slippageValue) &&
			nonNullish(valueDifference) &&
			$swapAmountsStore?.selectedProvider?.provider === SwapProviderType.KONG_SWAP
			? valueDifference < 0 && Math.abs(valueDifference) > Number(slippageValue)
			: false
	);
</script>

<SwapForm
	{errorType}
	fee={totalFee}
	{isSwapAmountsLoading}
	{onClose}
	onCustomValidate={customValidate}
	{onNext}
	{onShowTokensList}
	{isSlippageExceeded}
	bind:swapAmount
	bind:receiveAmount
	bind:slippageValue
>
	{#snippet swapAdditionalInfo()}
		{#if isSlippageExceeded && nonNullish(slippageValue) && nonNullish(valueDifference)}
			<MessageBox styleClass="sm:text-sm mt-4">
				<Html
					text={replacePlaceholders($i18n.swap.error.swap_slippage_exceeded_exchange_rate, {
						$valueDifference: valueDifference.toFixed(2),
						$maxSlippage: `${slippageValue}`
					})}
				/>
			</MessageBox>
		{/if}
	{/snippet}
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

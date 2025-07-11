<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SWAP_SLIPPAGE_INVALID_VALUE } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';
	import NewSwapForm from './NewSwapForm.svelte';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount: number | undefined;
		slippageValue: OptionAmount;
		sourceTokenFee?: bigint | undefined;
	}

	let {
		swapAmount = $bindable<OptionAmount>(),
		receiveAmount = $bindable<number | undefined>(),
		slippageValue = $bindable<OptionAmount>(),
		sourceTokenFee
	}: Props = $props();

	const { sourceToken, destinationToken, sourceTokenBalance, isSourceTokenIcrc2 } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	let errorType: TokenActionErrorType = $state<TokenActionErrorType | undefined>(undefined);

	let totalFee: bigint | undefined = $derived(
		(sourceTokenFee ?? ZERO) * ($isSourceTokenIcrc2 ? 2n : 1n)
	);

	let swapAmountsLoading = $derived(
		nonNullish(swapAmount) && nonNullish($swapAmountsStore?.amountForSwap)
			? Number(swapAmount) !== Number($swapAmountsStore.amountForSwap)
			: false
	);

	let invalid: boolean = $derived(
		nonNullish(errorType) ||
			isNullish(swapAmount) ||
			Number(swapAmount) <= 0 ||
			isNullish(receiveAmount) ||
			isNullish(sourceTokenFee) ||
			swapAmountsLoading ||
			(nonNullish(slippageValue) && Number(slippageValue) >= SWAP_SLIPPAGE_INVALID_VALUE)
	);

	const dispatch = createEventDispatcher();

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

<ContentWithToolbar>
	<div>
		<NewSwapForm
			on:icClose
			on:icNext
			on:icShowTokensList
			on:icShowProviderList
			bind:swapAmount
			bind:receiveAmount
			bind:slippageValue
			{customValidate}
			{errorType}
			fee={totalFee}
			{swapAmountsLoading}
		/>

		{#if nonNullish($destinationToken) && nonNullish($sourceToken)}
			<Hr spacing="md" />

			<div class="flex flex-col gap-3">
				<SwapProvider on:icShowProviderList showSelectButton {slippageValue} />
				<SwapFees />
			</div>
		{/if}
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={() => dispatch('icClose')} />

			<Button disabled={invalid} onclick={() => dispatch('icNext')}>
				{$i18n.swap.text.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

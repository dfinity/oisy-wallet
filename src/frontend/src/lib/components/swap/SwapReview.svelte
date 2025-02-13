<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapImpact from '$lib/components/swap/SwapValueDifference.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let slippageValue: OptionAmount;

	const dispatch = createEventDispatcher();

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<div slot="outer-content" class="mx-6 mb-12">
		<TokensReview
			sendAmount={swapAmount}
			{receiveAmount}
			sourceToken={$sourceToken}
			destinationToken={$destinationToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
			destinationTokenExchangeRate={$destinationTokenExchangeRate}
		/>

		{#if nonNullish($sourceTokenExchangeRate) && nonNullish($destinationTokenExchangeRate)}
			<ModalValue>
				<svelte:fragment slot="label">{$i18n.swap.text.value_difference}</svelte:fragment>

				<svelte:fragment slot="main-value">
					<SwapImpact {swapAmount} {receiveAmount} />
				</svelte:fragment>
			</ModalValue>
		{/if}

		<ModalValue>
			<svelte:fragment slot="label">{$i18n.swap.text.max_slippage}</svelte:fragment>

			<svelte:fragment slot="main-value">
				{slippageValue}%
			</svelte:fragment>
		</ModalValue>

		<SwapFees {swapAmount} />
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />

		<Button on:click={() => dispatch('icSwap')}>
			{$i18n.swap.text.swap_button}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>

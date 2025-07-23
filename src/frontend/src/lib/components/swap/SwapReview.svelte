<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SwapFees from '$lib/components/swap/SwapFees.svelte';
	import SwapProvider from '$lib/components/swap/SwapProvider.svelte';
	import SwapImpact from '$lib/components/swap/SwapValueDifference.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import CustomError from './CustomError.svelte';

	export let swapAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let slippageValue: OptionAmount;

	const dispatch = createEventDispatcher();

	const {
		sourceToken,
		destinationToken,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		failedSwapError
	} = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const onClick = () => {
		failedSwapError.set(undefined);
		dispatch('icBack');
	};
</script>

<ContentWithToolbar>
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
			{#snippet label()}
				{$i18n.swap.text.value_difference}
			{/snippet}

			{#snippet mainValue()}
				<SwapImpact {swapAmount} {receiveAmount} />
			{/snippet}
		</ModalValue>
	{/if}

	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.max_slippage}
		{/snippet}

		{#snippet mainValue()}
			{slippageValue}%
		{/snippet}
	</ModalValue>

	<div class="flex flex-col gap-3">
		<SwapProvider {slippageValue} />
		<SwapFees />
	</div>

	{#if nonNullish($failedSwapError)}
		<div class="mt-4">
			<MessageBox level={$failedSwapError.variant}>
				{#if $failedSwapError.message === $i18n.swap.error.withdraw_failed && nonNullish($failedSwapError?.url)}
					<CustomError
						firstMessage={$i18n.swap.error.swap_failed_withdraw_success_first_part}
						firstLink={{
							link: ' https://docs.oisy.com/using-oisy-wallet/how-tos/swapping-tokens',
							text: $i18n.swap.error.swap_failed_instruction_link
						}}
						secondMessage={$i18n.swap.error.swap_failed_withdraw_success_first_part}
						secondLink={{ link: $failedSwapError.url.url, text: $failedSwapError.url.text }}
					/>
				{:else}
					{$failedSwapError.message}
				{/if}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onClick} />

			<Button onclick={() => dispatch('icSwap')}>
				{$i18n.swap.text.swap_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

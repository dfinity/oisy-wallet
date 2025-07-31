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
	import { OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK } from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';

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
		destinationToken={$destinationToken}
		destinationTokenExchangeRate={$destinationTokenExchangeRate}
		{receiveAmount}
		sendAmount={swapAmount}
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
	/>

	{#if nonNullish($sourceTokenExchangeRate) && nonNullish($destinationTokenExchangeRate)}
		<ModalValue>
			{#snippet label()}
				{$i18n.swap.text.value_difference}
			{/snippet}

			{#snippet mainValue()}
				<SwapImpact {receiveAmount} {swapAmount} />
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
					{$i18n.swap.error.withdraw_failed_first_part}
					<ExternalLink
						ariaLabel={$i18n.swap.text.open_instructions_link}
						href={OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK}
						iconSize="15">{$i18n.swap.error.swap_failed_instruction_link}</ExternalLink
					>
					{$i18n.swap.error.withdraw_failed_second_part}

					<ExternalLink
						ariaLabel={$i18n.swap.text.open_icp_swap}
						href={$failedSwapError.url.url}
						iconSize="15">{$failedSwapError.url.text}</ExternalLink
					>
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

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
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext as SwapAmountsContextType
	} from '$lib/stores/swap-amounts.store';
	import { formatTokenBigintToNumber } from '$lib/utils/format.utils';
	import { Html } from '@dfinity/gix-components';
	import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
	import EthFeeDisplay from '$eth/components/fee/EthFeeDisplay.svelte';

	interface Props {
		swapAmount: OptionAmount;
		receiveAmount?: number;
		slippageValue: OptionAmount;
	}

	let { swapAmount, receiveAmount, slippageValue }: Props = $props();

	const dispatch = createEventDispatcher();

	const { store: swapAmountsStore } = getContext<SwapAmountsContextType>(SWAP_AMOUNTS_CONTEXT_KEY);

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

	$effect(() => {
		if (
			nonNullish($destinationToken) &&
			nonNullish($swapAmountsStore?.selectedProvider?.receiveAmount)
		) {
			receiveAmount = formatTokenBigintToNumber({
				value: $swapAmountsStore?.selectedProvider?.receiveAmount,
				unitName: $destinationToken.decimals,
				displayDecimals: $destinationToken.decimals
			});
		} else {
			receiveAmount = undefined;
		}
	});
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
		{#if $sourceToken?.network.id === ICP_NETWORK_ID}
			<SwapFees />
		{:else}
			<EthFeeDisplay>
				<Html slot="label" text="Total estimated fee" />
			</EthFeeDisplay>

			<MessageBox styleClass="sm:text-sm">
				<Html text={`You move tokens from <b>Ethereum</b> to <b>Base</b> network`} />
			</MessageBox>
		{/if}
	</div>

	{#if $sourceToken?.network.id !== $destinationToken?.network.id}
		<MessageBox styleClass="sm:text-sm">
			<Html text={`You move tokens from <b>Ethereum</b> to <b>Base</b> network`} />
		</MessageBox>
	{/if}

	{#if nonNullish($failedSwapError)}
		<div class="mt-4">
			<MessageBox level={$failedSwapError.variant}>
				{$failedSwapError.message}
				{#if nonNullish($failedSwapError?.url)}
					<ExternalLink href={$failedSwapError.url.url} ariaLabel={$i18n.swap.text.open_icp_swap}
						>{$failedSwapError.url.text}</ExternalLink
					>
				{/if}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onClick} />

			<Button
				onclick={() => {
					dispatch('icStopTrigger');
					dispatch('icSwap');
				}}
			>
				{$i18n.swap.text.swap_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

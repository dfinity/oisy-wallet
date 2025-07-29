<script lang="ts">
	import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';
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
	import { SwapErrorCodes } from '$lib/types/swap';
	import { Html } from '@dfinity/gix-components';

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

	$: () => console.log($failedSwapError, 'error');
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
			<span
				>{$failedSwapError.errorType}: {$failedSwapError.message}
				{$failedSwapError.errorType === SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED}</span
			>
			<MessageBox level={$failedSwapError.variant}>
				{#if nonNullish($failedSwapError.errorType) && nonNullish($failedSwapError.url) && isEmptyString($failedSwapError?.message)}
					{#if $failedSwapError.errorType === SwapErrorCodes.SWAP_FAILED_WITHDRAW_FAILED}
						<Html text={$i18n.swap.error.withdraw_failed_first_part} />
						<ExternalLink
							iconSize="15"
							href={OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK}
							ariaLabel={$i18n.swap.text.open_instructions_link}
							>{$i18n.swap.error.swap_failed_instruction_link}</ExternalLink
						>
						{$i18n.swap.error.withdraw_failed_second_part}

						<ExternalLink
							iconSize="15"
							href={$failedSwapError.url.url}
							ariaLabel={$i18n.swap.text.open_icp_swap}>{$failedSwapError.url.text}</ExternalLink
						>
					{:else if $failedSwapError.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_FAILED}
						{$i18n.swap.error.manually_withdraw_failed}
						<ExternalLink
							iconSize="15"
							href={OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK}
							ariaLabel={$i18n.swap.text.open_instructions_link}
							>{$i18n.swap.error.swap_failed_instruction_link}</ExternalLink
						>
						{$i18n.swap.error.withdraw_failed_second_part}

						<ExternalLink
							iconSize="15"
							href={$failedSwapError.url.url}
							ariaLabel={$i18n.swap.text.open_icp_swap}>{$failedSwapError.url.text}</ExternalLink
						>
					{:else if $failedSwapError.errorType === SwapErrorCodes.SWAP_SUCCESS_WITHDRAW_FAILED}
						{$i18n.swap.error.swap_sucess_withdraw_failed}
						<ExternalLink
							iconSize="15"
							href={OISY_DOCS_SWAP_WIDTHDRAW_FROM_ICPSWAP_LINK}
							ariaLabel={$i18n.swap.text.open_instructions_link}
							>{$i18n.swap.error.swap_failed_instruction_link}</ExternalLink
						>
						{$i18n.swap.error.withdraw_failed_second_part}
						<ExternalLink
							iconSize="15"
							href={$failedSwapError.url.url}
							ariaLabel={$i18n.swap.text.open_icp_swap}>{$failedSwapError.url.text}</ExternalLink
						>
					{/if}
				{:else}
					{$failedSwapError.message}
				{/if}
			</MessageBox>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			{#if !($failedSwapError?.errorType === SwapErrorCodes.ICP_SWAP_WITHDRAW_SUCCESS && $failedSwapError?.message === $i18n.swap.error.swap_sucess_manually_withdraw_success)}
				<ButtonBack onclick={onClick} />
			{/if}

			<Button onclick={() => dispatch('icSwap')}>
				{nonNullish($failedSwapError?.errorType) && isEmptyString($failedSwapError?.message)
					? 'Withdraw'
					: $i18n.swap.text.swap_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

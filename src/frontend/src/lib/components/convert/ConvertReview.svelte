<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import ConvertReviewNetworks from '$lib/components/convert/ConvertReviewNetworks.svelte';
	import AllowanceOutcomeMessage from '$lib/components/core/AllowanceOutcomeMessage.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import { blocksRetry } from '$lib/utils/allowance.utils';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		disabled?: boolean;
		onConvert: () => void;
		destination?: Snippet;
		fee: Snippet;
		infoMessage?: Snippet;
		cancel: Snippet;
	}

	let {
		sendAmount,
		receiveAmount,
		disabled = false,
		onConvert,
		destination,
		fee,
		infoMessage,
		cancel
	}: Props = $props();

	const {
		sourceToken,
		destinationToken,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		convertAllowanceOutcome
	} = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let convertDisabled = $derived(
		disabled || (nonNullish($convertAllowanceOutcome) && blocksRetry($convertAllowanceOutcome))
	);
</script>

<ContentWithToolbar>
	<TokensReview
		destinationToken={$destinationToken}
		destinationTokenExchangeRate={$destinationTokenExchangeRate}
		{receiveAmount}
		{sendAmount}
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
	/>

	<ConvertReviewNetworks />

	{@render destination?.()}

	{@render fee()}

	{@render infoMessage?.()}

	{#if nonNullish($convertAllowanceOutcome)}
		<div class="mt-4">
			<AllowanceOutcomeMessage outcome={$convertAllowanceOutcome} styleClass="mb-0!" />
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			{@render cancel()}

			<Button disabled={convertDisabled} onclick={onConvert} testId="convert-review-button-next">
				{$i18n.convert.text.convert_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

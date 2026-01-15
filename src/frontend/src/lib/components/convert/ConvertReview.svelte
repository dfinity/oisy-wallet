<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import ConvertReviewNetworks from '$lib/components/convert/ConvertReviewNetworks.svelte';
	import TokensReview from '$lib/components/tokens/TokensReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		onConvert: () => void;
		destination?: Snippet;
		fee: Snippet;
		infoMessage?: Snippet;
		cancel: Snippet;
	}

	let { sendAmount, receiveAmount, onConvert, destination, fee, infoMessage, cancel }: Props =
		$props();

	const { sourceToken, destinationToken, sourceTokenExchangeRate, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
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

	{#snippet toolbar()}
		<ButtonGroup>
			{@render cancel()}

			<Button onclick={onConvert} testId="convert-review-button-next">
				{$i18n.convert.text.convert_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

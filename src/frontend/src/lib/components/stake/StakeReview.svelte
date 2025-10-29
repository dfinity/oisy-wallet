<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { Address } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		amount?: OptionAmount;
		destination?: Address;
		disabled?: boolean;
		network?: Snippet;
		fee?: Snippet;
		provider?: Snippet;
		subtitle?: Snippet;
		onBack: () => void;
		onStake: () => void;
	}

	let {
		amount,
		destination,
		disabled = false,
		network,
		fee,
		provider,
		subtitle,
		onBack,
		onStake
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<SendTokenReview
		exchangeRate={$sendTokenExchangeRate}
		sendAmount={amount}
		{subtitle}
		token={$sendToken}
	/>

	{#if nonNullish(destination)}
		<div class="mb-4">
			<SendReviewDestination {destination} />
		</div>
	{/if}

	{@render network?.()}

	{@render fee?.()}

	{@render provider?.()}

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonBack onclick={onBack} />
			<Button {disabled} onclick={onStake} testId={STAKE_REVIEW_FORM_BUTTON}>
				{$i18n.send.text.send}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

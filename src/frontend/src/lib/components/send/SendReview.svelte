<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendNftReview from '$lib/components/tokens/SendNftReview.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { Nft } from '$lib/types/nft';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		destination?: string;
		amount?: OptionAmount;
		disabled?: boolean;
		selectedContact?: ContactUi;
		nft?: Nft;
		network?: Snippet;
		fee?: Snippet;
		info?: Snippet;
		toolbar?: Snippet;
		onBack: () => void;
		onSend: () => void;
	}

	let {
		destination = '',
		amount,
		disabled = false,
		selectedContact,
		nft,
		network,
		fee,
		info,
		toolbar: toolbarProp,
		onBack,
		onSend
	}: Props = $props();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	{#if isNullish(nft)}
		<SendTokenReview exchangeRate={$sendTokenExchangeRate} sendAmount={amount} token={$sendToken} />
	{:else}
		<SendNftReview {nft} />
	{/if}

	<div class="mb-4">
		<SendReviewDestination {destination} {selectedContact} />
	</div>

	{@render network?.()}

	{@render fee?.()}

	{@render info?.()}

	{#snippet toolbar()}
		{#if nonNullish(toolbarProp)}
			{@render toolbarProp()}
		{:else}
			<ButtonGroup testId="toolbar">
				<ButtonBack onclick={onBack} />
				<Button {disabled} onclick={onSend} testId={REVIEW_FORM_SEND_BUTTON}>
					{$i18n.send.text.send}
				</Button>
			</ButtonGroup>
		{/if}
	{/snippet}
</ContentWithToolbar>

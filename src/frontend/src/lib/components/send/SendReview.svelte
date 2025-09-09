<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { OptionAmount } from '$lib/types/send';
	import { isNullish } from '@dfinity/utils';
	import SendNftReview from '$lib/components/tokens/SendNftReview.svelte';
	import type { Nft } from '$lib/types/nft';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let disabled: boolean | undefined = false;
	export let selectedContact: ContactUi | undefined = undefined;
	export let nft: Nft | undefined = undefined;

	const dispatch = createEventDispatcher();

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

	<slot name="network" />

	<slot name="fee" />

	<slot name="info" />

	{#snippet toolbar()}
		<ButtonGroup testId="toolbar">
			<ButtonBack onclick={() => dispatch('icBack')} />
			<Button {disabled} onclick={() => dispatch('icSend')} testId={REVIEW_FORM_SEND_BUTTON}>
				{$i18n.send.text.send}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import SendTokenReview from '$lib/components/tokens/SendTokenReview.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';

	export let destination = '';
	export let amount: OptionAmount = undefined;
	export let disabled: boolean | undefined = false;

	const dispatch = createEventDispatcher();

	const { sendToken, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	<SendTokenReview sendAmount={amount} token={$sendToken} exchangeRate={$sendTokenExchangeRate} />

	<SendDataDestination {destination} />

	<slot name="network" />

	<slot name="fee" />

	<slot name="info" />

	<ButtonGroup slot="toolbar" testId="toolbar">
		<ButtonBack onclick={() => dispatch('icBack')} />
		<Button {disabled} on:click={() => dispatch('icSend')} testId={REVIEW_FORM_SEND_BUTTON}>
			{$i18n.send.text.send}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>

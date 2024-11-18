<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import SendData from '$lib/components/send/SendData.svelte';
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
	export let source: string;
	export let disabled: boolean | undefined = false;

	const dispatch = createEventDispatcher();

	const { sendToken, sendBalance } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

<ContentWithToolbar>
	{#if nonNullish($sendToken)}
		<SendData {amount} {destination} token={$sendToken} balance={$sendBalance} {source}>
			<slot name="fee" slot="fee" />

			<slot name="network" slot="network" />
		</SendData>
	{/if}

	<slot name="info" />

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={() => dispatch('icBack')} />
		<Button {disabled} on:click={() => dispatch('icSend')} testId={REVIEW_FORM_SEND_BUTTON}>
			{$i18n.send.text.send}
		</Button>
	</ButtonGroup>
</ContentWithToolbar>

<script lang="ts">
	import { type Snippet, createEventDispatcher } from 'svelte';
	import { preventDefault } from 'svelte/legacy';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		destination?: string;
		invalidDestination?: boolean;
		disabled?: boolean | undefined;
		selectedContact?: ContactUi;
		amount?: Snippet;
		fee?: Snippet;
		info?: Snippet;
		cancel?: Snippet;
	}

	let {
		destination = '',
		invalidDestination = false,
		disabled = false,
		selectedContact = undefined,
		amount,
		fee,
		info,
		cancel
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
</script>

<form onsubmit={preventDefault(() => dispatch('icNext'))} method="POST">
	<ContentWithToolbar>
		{@render amount?.()}

		<SendDestination
			{destination}
			{invalidDestination}
			{selectedContact}
			on:icSendDestinationStep={back}
		/>

		{@render fee?.()}

		{@render info?.()}

		{#snippet toolbar()}
			<ButtonGroup testId="toolbar">
				{@render cancel?.()}

				<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactUi } from '$lib/types/contact';

	export let destination = '';
	export let invalidDestination = false;
	export let disabled: boolean | undefined = false;
	export let selectedContact: ContactUi | undefined = undefined;

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
</script>

<form method="POST" on:submit|preventDefault={() => dispatch('icNext')}>
	<ContentWithToolbar>
		<slot name="amount" />

		<SendDestination
			{destination}
			{invalidDestination}
			{selectedContact}
			on:icSendDestinationStep={back}
		/>

		<slot name="fee" />

		<slot name="info" />

		{#snippet toolbar()}
			<ButtonGroup testId="toolbar">
				<slot name="cancel" />

				<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>

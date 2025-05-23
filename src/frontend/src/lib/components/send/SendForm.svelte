<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';

	export let destination = '';
	export let invalidDestination = false;
	export let disabled: boolean | undefined = false;

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<slot name="amount" />

		<SendDestination {destination} {invalidDestination} on:icSendDestinationStep={back} />

		<slot name="fee" />

		<slot name="info" />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />

			<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>

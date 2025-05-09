<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import SendSource from '$lib/components/send/SendSource.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { OptionBalance } from '$lib/types/balance';
	import type { OptionToken } from '$lib/types/token';

	export let source: string | undefined = undefined;
	export let destination = '';
	export let invalidDestination = false;
	export let disabled: boolean | undefined = false;
	export let token: OptionToken;
	export let balance: OptionBalance;
	export let hideSource = false;

	const dispatch = createEventDispatcher();

	const back = () => dispatch('icBack');
</script>

<form on:submit={() => dispatch('icNext')} method="POST">
	<ContentWithToolbar>
		<slot name="amount" />

		<SendDestination {destination} {invalidDestination} on:icSendDestinationStep={back} />

		{#if !hideSource && nonNullish(source)}
			<SendSource {token} {balance} {source} />
		{/if}

		<slot name="fee" />

		<slot name="info" />

		<ButtonGroup slot="toolbar" testId="toolbar">
			<slot name="cancel" />

			<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
		</ButtonGroup>
	</ContentWithToolbar>
</form>

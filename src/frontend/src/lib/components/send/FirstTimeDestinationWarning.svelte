<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import {
		SEND_FIRST_TIME_DESTINATION_CONFIRM,
		SEND_FIRST_TIME_DESTINATION_WARNING
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		confirmed?: boolean;
		styleClass?: string;
		// Providing a confirmation callback turns the warning into a gate: the consumer owns the
		// checked state and decides what a tick enables.
		onConfirm?: () => void;
	}

	let { confirmed = false, styleClass, onConfirm }: Props = $props();

	const inputId = 'send-first-time-destination-confirmation';
</script>

{#snippet checkbox()}
	<Checkbox
		checked={confirmed}
		{inputId}
		onChange={onConfirm}
		testId={SEND_FIRST_TIME_DESTINATION_CONFIRM}
	/>
{/snippet}

{#snippet text()}
	<!-- The confirmation speaks in the first person, as the label of what the user is ticking, so
	it replaces the warning rather than being appended to it. -->
	{nonNullish(onConfirm)
		? $i18n.send.info.first_time_destination_confirm
		: $i18n.send.info.first_time_destination}
{/snippet}

<MessageBox
	icon={nonNullish(onConfirm) ? checkbox : undefined}
	level="warning"
	{styleClass}
	testId={SEND_FIRST_TIME_DESTINATION_WARNING}
>
	{#if nonNullish(onConfirm)}
		<label class="block text-sm leading-snug" for={inputId}>{@render text()}</label>
	{:else}
		<span class="block text-sm leading-snug">{@render text()}</span>
	{/if}
</MessageBox>

<script lang="ts">
	import { preventDefault } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonNext from '$lib/components/ui/ButtonNext.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { SEND_FORM_NEXT_BUTTON } from '$lib/constants/test-ids.constants';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		destination?: string;
		invalidDestination?: boolean;
		disabled?: boolean;
		selectedContact?: ContactUi;
		onBack: () => void;
		onNext: () => void;
		sendAmount: Snippet;
		fee?: Snippet;
		info?: Snippet;
		cancel: Snippet;
	}

	let {
		destination = '',
		invalidDestination = false,
		disabled = false,
		selectedContact,
		onBack,
		onNext,
		sendAmount,
		fee,
		info,
		cancel
	}: Props = $props();

	const back = () => onBack();
</script>

<form method="POST" onsubmit={preventDefault(onNext)}>
	<ContentWithToolbar>
		{@render sendAmount()}

		<SendDestination
			{destination}
			{invalidDestination}
			onSendDestinationStep={back}
			{selectedContact}
		/>

		{@render fee?.()}

		{@render info?.()}

		{#snippet toolbar()}
			<ButtonGroup testId="toolbar">
				{@render cancel()}

				<ButtonNext {disabled} testId={SEND_FORM_NEXT_BUTTON} />
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</form>

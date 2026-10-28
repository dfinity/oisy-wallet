<!-- Stubs `SendDestinationWizardStep` when unit-testing `SendModal`'s amount handling and steps. -->
<script lang="ts">
	import type { ContactUi } from '$lib/types/contact';
	import type { SendDestinationTab } from '$lib/types/send';

	interface Props {
		destination: string;
		activeSendDestinationTab: SendDestinationTab;
		selectedContact?: ContactUi;
		formCancelAction?: 'back' | 'close';
		onBack: () => void;
		onNext: () => void;
	}

	let {
		destination = $bindable(),
		activeSendDestinationTab = $bindable(),
		selectedContact = $bindable(),
		formCancelAction,
		onBack,
		onNext
	}: Props = $props();
</script>

<span data-tid="stub-destination">{destination}</span>
<span data-tid="stub-destination-cancel-action">{formCancelAction}</span>
<button data-tid="stub-destination-back" onclick={onBack}>back</button>
<span data-tid="stub-destination-tab">{activeSendDestinationTab}</span>
<span data-tid="stub-destination-contact">{selectedContact?.name ?? ''}</span>
<button
	data-tid="stub-destination-next"
	onclick={() => {
		destination = 'stub-destination-1';
		onNext();
	}}>next</button
>
<button
	data-tid="stub-destination-change-and-next"
	onclick={() => {
		destination = 'stub-destination-2';
		onNext();
	}}>change</button
>

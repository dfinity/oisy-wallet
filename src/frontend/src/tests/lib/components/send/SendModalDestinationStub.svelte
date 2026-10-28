<!-- Stubs `SendDestinationWizardStep` when unit-testing `SendModal`'s amount handling and steps. -->
<script lang="ts">
	import type { ContactUi } from '$lib/types/contact';
	import type { SendDestinationTab } from '$lib/types/send';
	import { getMockContactsUi } from '$tests/mocks/contacts.mock';
	import { mockPrincipalText2 } from '$tests/mocks/identity.mock';

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
<!-- A principal, valid for any Internet Computer token, so switching tokens can skip this step. Not
     `mockPrincipalText`, the mock tokens' minting account, which would turn the send into a burn. -->
<button
	data-tid="stub-destination-principal-next"
	onclick={() => {
		destination = mockPrincipalText2;
		onNext();
	}}>principal</button
>
<button
	data-tid="stub-destination-contact-next"
	onclick={() => {
		[selectedContact] = getMockContactsUi({ n: 1, name: 'Alice', addresses: [] });
		destination = mockPrincipalText2;
		onNext();
	}}>contact</button
>

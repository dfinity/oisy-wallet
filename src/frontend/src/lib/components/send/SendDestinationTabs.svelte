<script lang="ts">
	import KnownDestinationsComponent from '$lib/components/send/KnownDestinations.svelte';
	import SendContacts from '$lib/components/send/SendContacts.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { SendDestinationTab } from '$lib/types/send';
	import type { KnownDestinations } from '$lib/types/transactions';

	interface Props {
		destination: string;
		activeSendDestinationTab: SendDestinationTab;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
		selectedContact?: ContactUi;
	}

	let {
		knownDestinations,
		destination = $bindable(),
		activeSendDestinationTab = $bindable(),
		selectedContact = $bindable(),
		networkContacts
	}: Props = $props();
</script>

<div class="my-6">
	<Tabs
		tabs={[
			{ label: $i18n.send.text.recently_used_tab, id: 'recentlyUsed' },
			{ label: $i18n.send.text.contacts_tab, id: 'contacts' }
		]}
		bind:activeTab={activeSendDestinationTab}
	>
		{#if activeSendDestinationTab === 'recentlyUsed'}
			<KnownDestinationsComponent
				{knownDestinations}
				{networkContacts}
				bind:selectedContact
				bind:destination
				on:icNext
			/>
		{:else if activeSendDestinationTab === 'contacts'}
			<SendContacts {networkContacts} bind:destination bind:selectedContact on:icNext />
		{/if}
	</Tabs>
</div>

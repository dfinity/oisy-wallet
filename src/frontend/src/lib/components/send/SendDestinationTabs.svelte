<script lang="ts">
	import KnownDestinationsComponent from '$lib/components/send/KnownDestinations.svelte';
	import SendContacts from '$lib/components/send/SendContacts.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { NetworkId } from '$lib/types/network';
	import type { SendDestinationTab } from '$lib/types/send';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
	import type { KnownDestinations } from '$lib/types/transactions';

	interface Props {
		destination: string;
		activeSendDestinationTab: SendDestinationTab;
		networkId: NetworkId;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
		selectedContact?: ContactUi;
	}

	let {
		knownDestinations,
		destination = $bindable(),
		activeSendDestinationTab = $bindable(),
		networkId,
		selectedContact = $bindable(),
		networkContacts
	}: Props = $props();
</script>

<div class="my-6">
	<Tabs
		bind:activeTab={activeSendDestinationTab}
		tabs={[
			{ label: $i18n.send.text.recently_used_tab, id: 'recentlyUsed' },
			{ label: $i18n.send.text.contacts_tab, id: 'contacts' }
		]}
	>
		{#if activeSendDestinationTab === 'recentlyUsed'}
			<KnownDestinationsComponent
				{knownDestinations}
				{networkContacts}
				{networkId}
				bind:selectedContact
				bind:destination
				on:icNext
			/>
		{:else if activeSendDestinationTab === 'contacts'}
			<SendContacts {networkContacts} {networkId} bind:destination bind:selectedContact on:icNext />
		{/if}
	</Tabs>
</div>

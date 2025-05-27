<script lang="ts">
	import KnownDestinationsComponent from '$lib/components/send/KnownDestinations.svelte';
	import SendContacts from '$lib/components/send/SendContacts.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { KnownDestinations } from '$lib/types/transactions';

	interface Props {
		knownDestinations?: KnownDestinations;
		destination: string;
	}

	let { knownDestinations, destination = $bindable() }: Props = $props();

	let activeTab = $derived<'recentlyUsed' | 'contacts'>('recentlyUsed');
</script>

<div class="my-6">
	<Tabs
		bind:activeTab
		tabs={[
			{ label: $i18n.send.text.recently_used_tab, id: 'recentlyUsed' },
			{ label: $i18n.send.text.contacts_tab, id: 'contacts' }
		]}
	>
		{#if activeTab === 'recentlyUsed'}
			<KnownDestinationsComponent {knownDestinations} bind:destination on:icNext />
		{:else if activeTab === 'contacts'}
			<SendContacts />
		{/if}
	</Tabs>
</div>

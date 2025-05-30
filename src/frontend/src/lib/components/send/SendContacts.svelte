<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import SendContact from '$lib/components/send/SendContact.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/contacts';

	interface Props {
		destination: string;
		networkContacts?: NetworkContacts;
		selectedContact?: ContactUi;
	}

	let {
		networkContacts,
		selectedContact = $bindable(),
		destination = $bindable()
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let filteredNetworkContacts = $derived(
		nonNullish(networkContacts)
			? Object.keys(networkContacts).reduce<NetworkContacts>(
					(acc, address) => ({
						...acc,
						...(address.includes(destination) ? { [address]: networkContacts[address] } : {})
					}),
					{}
				)
			: {}
	);

	let filteredNetworkContactsKeys = $derived(Object.keys(filteredNetworkContacts));
</script>

{#if nonNullish(networkContacts) && filteredNetworkContactsKeys.length > 0}
	<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]">
		<ul class="list-none overflow-y-auto overscroll-contain">
			{#each filteredNetworkContactsKeys as address, index (index)}
				<SendContact
					contact={networkContacts[address]}
					{address}
					onClick={() => {
						selectedContact = networkContacts[address];
						destination = address;
						dispatch('icNext');
					}}
				/>
			{/each}
		</ul>
	</div>
{:else}
	<EmptyState
		title={$i18n.send.text.contacts_empty_state_title}
		description={$i18n.send.text.contacts_empty_state_description}
	/>
{/if}

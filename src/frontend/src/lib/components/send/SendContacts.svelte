<script lang="ts">
	import { isEmptyString, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import SendContact from '$lib/components/send/SendContact.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { ContactUi } from '$lib/types/contact';
	import type { NetworkContacts } from '$lib/types/contacts';
	import { isContactMatchingFilter } from '$lib/utils/contact.utils';

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

	const { sendTokenNetworkId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let filteredNetworkContacts = $derived(
		nonNullish(networkContacts)
			? isEmptyString(destination)
				? networkContacts
				: Object.entries(networkContacts).reduce<NetworkContacts>(
						(acc, [key, { contact, address }]) => ({
							...acc,
							...(isContactMatchingFilter({
								filterValue: destination,
								contact,
								address,
								networkId: $sendTokenNetworkId
							})
								? { [key]: { address, contact } }
								: {})
						}),
						{}
					)
			: {}
	);
</script>

<div in:fade>
	{#if nonNullish(networkContacts) && Object.keys(filteredNetworkContacts).length > 0}
		<div class="flex flex-col overflow-y-hidden sm:max-h-[13.5rem]" in:fade>
			<ul class="list-none overflow-y-auto overscroll-contain">
				{#each Object.values(filteredNetworkContacts) as { contact, address }, index (index)}
					<SendContact
						{address}
						{contact}
						onClick={() => {
							selectedContact = contact;
							destination = address;
							dispatch('icNext');
						}}
					/>
				{/each}
			</ul>
		</div>
	{:else}
		<EmptyState
			description={$i18n.send.text.contacts_empty_state_description}
			title={$i18n.send.text.contacts_empty_state_title}
		/>
	{/if}
</div>

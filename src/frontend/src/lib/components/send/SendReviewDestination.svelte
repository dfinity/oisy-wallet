<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { getContactForAddress } from '$lib/utils/contact.utils';

	interface Props {
		destination: string;
		selectedContact?: ContactUi;
		aiAssistantConsoleView?: boolean;
	}

	const { destination, selectedContact, aiAssistantConsoleView }: Props = $props();

	let contact = $derived(
		selectedContact ?? getContactForAddress({ addressString: destination, contactList: $contacts })
	);
</script>

<AddressCard>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge
				address={destination}
				badge={{ type: 'addressType', address: destination }}
				{contact}
				variant={aiAssistantConsoleView ? 'sm' : 'md'}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<div class:text-sm={aiAssistantConsoleView}>
			{#if isNullish(contact)}
				<span class="font-bold">{$i18n.transaction.text.to}</span>
			{:else}
				<SendContactName address={destination} {contact}>
					{$i18n.transaction.text.to} :
				</SendContactName>
			{/if}
		</div>

		<span class="w-full break-all whitespace-normal" class:text-sm={aiAssistantConsoleView}>
			{destination}
		</span>
	{/snippet}
</AddressCard>

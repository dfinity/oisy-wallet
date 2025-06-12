<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { getContactForAddress } from '$lib/utils/contact.utils';
	import { contacts } from '$lib/derived/contacts.derived';

	interface Props {
		destination: string;
	}

	const { destination }: Props = $props();

	let contact: ContactUi | undefined = $derived(
		nonNullish(destination)
			? getContactForAddress({
					contactList: $contacts,
					addressString: destination
				})
			: undefined
	);
</script>

<AddressCard>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge
				{contact}
				address={destination}
				badge={{ type: 'addressType', address: destination }}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		{#if isNullish(contact)}
			<span class="font-bold">{$i18n.transaction.text.to}</span>
		{:else}
			<SendContactName {contact} address={destination}>
				{$i18n.transaction.text.to} :
			</SendContactName>
		{/if}

		<span class="w-full whitespace-normal break-all">{destination}</span>
	{/snippet}
</AddressCard>

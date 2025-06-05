<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import SendContactName from '$lib/components/send/SendContactName.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		destination: string;
		selectedContact?: ContactUi;
	}

	const { destination, selectedContact }: Props = $props();
</script>

<AddressCard>
	{#snippet logo()}
		<div class="mr-2">
			<AvatarWithBadge
				contact={selectedContact}
				address={destination}
				badge={{ type: 'addressType', address: destination }}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		{#if isNullish(selectedContact)}
			<span class="font-bold">{$i18n.transaction.text.to}</span>
		{:else}
			<SendContactName contact={selectedContact} address={destination}>
				{$i18n.transaction.text.to} :
			</SendContactName>
		{/if}

		<span class="w-full whitespace-normal break-all">{destination}</span>
	{/snippet}
</AddressCard>

<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		destination: string;
		selectedContact?: ContactUi;
	}

	const { destination, selectedContact }: Props = $props();

	let selectedContactLabel = $derived(
		nonNullish(selectedContact)
			? selectedContact.addresses.find(({ address }) => address === destination)?.label
			: undefined
	);
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
		<span>
			<span class="font-bold">
				{$i18n.transaction.text.to}{nonNullish(selectedContact) ? `: ${selectedContact?.name}` : ''}
			</span>

			{#if notEmptyString(selectedContactLabel)}
				<Divider />
				{selectedContactLabel}
			{/if}
		</span>

		<span class="w-full whitespace-normal break-all">{destination}</span>
	{/snippet}
</AddressCard>

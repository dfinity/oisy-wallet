<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { getContactForAddress } from '$lib/utils/contact.utils';

	interface Props {
		type: 'send' | 'receive';
		to: string;
		toExplorerUrl?: string;
		from: string;
		fromExplorerUrl?: string;
	}

	const { type, to, from, toExplorerUrl, fromExplorerUrl }: Props = $props();

	let contact: ContactUi | undefined = $derived(
		getContactForAddress({
			contactList: $contacts,
			addressString: type === 'send' ? to : from
		})
	);
</script>

<AddressCard>
	{#snippet logo()}
		<AvatarWithBadge
			{contact}
			badge={{ type: 'addressType', address: type === 'send' ? to : from }}
		/>
	{/snippet}
	{#snippet content()}
		<span class="mx-1 flex flex-col items-start text-left">
			<span class="font-bold"
				>{type === 'send' ? $i18n.transaction.text.to : $i18n.transaction.text.from}: {contact?.name}</span
			>
			<span class="w-full truncate">{type === 'send' ? to : from}</span>
			<!--
			Todo: add action to button to navigate to add contact modal
			<Button link styleClass="mt-3 text-sm"><IconUserSquare size="20px" /> Save address</Button>
			-->
		</span>
	{/snippet}
	{#snippet actions()}
		<Copy
			value={type === 'send' ? to : from}
			text={type === 'send' ? $i18n.transaction.text.to_copied : $i18n.transaction.text.from_copied}
			inline
		/>
		{#if nonNullish(toExplorerUrl) && type === 'send'}
			<ExternalLink
				iconSize="18"
				href={toExplorerUrl}
				ariaLabel={$i18n.transaction.alt.open_to_block_explorer}
				inline
				color="blue"
			/>
		{/if}
		{#if nonNullish(fromExplorerUrl) && type === 'receive'}
			<ExternalLink
				iconSize="18"
				href={fromExplorerUrl}
				ariaLabel={$i18n.transaction.alt.open_from_block_explorer}
				inline
				color="blue"
			/>
		{/if}
	{/snippet}
</AddressCard>

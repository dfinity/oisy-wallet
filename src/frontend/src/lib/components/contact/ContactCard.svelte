<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import AddressName from '$lib/components/address/AddressName.svelte';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import Badge from '$lib/components/contact/Badge.svelte';
	import AddressItemActions from '$lib/components/ui/AddressItemActions.svelte';
	import type { Address, Contact } from '$lib/types/contact';
	import { shortenAddress } from '$lib/utils/address.utils';

	interface Props {
		contact: Contact;
		initiallyExpanded?: boolean;
		showInfoButtons?: boolean;
		oninfo?: (address: Address) => void;
	}
	const { contact, initiallyExpanded = false, showInfoButtons, oninfo }: Props = $props();
</script>

{#snippet badgeContent()}
	{#if contact.addresses.length === 1}
		<IconAddressType size="100%" addressType={contact.addresses[0].address_type} />
	{:else}
		{contact.addresses.length}
	{/if}
{/snippet}

{#snippet header()}
	<div class="flex items-center gap-3">
		<Badge
			content={contact.addresses.length > 0 ? badgeContent : undefined}
			showBorder={contact.addresses.length !== 1}
		>
			<Avatar name={contact.name} variant="xs" styleClass="md:text-[19.2px]"></Avatar>
		</Badge>
		<div>
			<div class="text-base font-bold md:text-lg">{contact.name}</div>
			<div class="flex items-center gap-1 text-xs text-tertiary md:text-sm">
				{#each contact.addresses as address, i (address.address)}
					{#if i !== 0}
						<span class="text-[0.5rem]">•</span>
					{/if}
					<span
						class:font-bold={contact.addresses.length === 1}
						class:text-primary={contact.addresses.length === 1}><AddressName {address} /></span
					>
				{/each}
				{#if contact.addresses.length === 1}
					&nbsp;{shortenAddress(contact.addresses[0].address)}
				{/if}
			</div>
		</div>
		<div class="flex-grow"></div>
		{#if contact.addresses.length === 1}
			<AddressItemActions
				styleClass="ml-auto"
				address={contact.addresses[0]}
				showInfoButton={showInfoButtons}
				oninfo={() => oninfo?.(contact.addresses[0])}
			/>
		{/if}
	</div>
{/snippet}

<div class="flex w-full flex-col rounded-xl p-2 hover:bg-brand-subtle-10">
	{#if contact.addresses.length > 1}
		<Collapsible iconSize="medium" {initiallyExpanded}>
			<div slot="header">
				{@render header()}
			</div>
			<div class="flex flex-col gap-1.5 md:pl-20">
				{#each contact.addresses as address (address.address)}
					<AddressListItem
						{address}
						showInfoButton={showInfoButtons}
						oninfo={() => oninfo?.(address)}
					></AddressListItem>
				{/each}
			</div>
		</Collapsible>
	{:else}
		{@render header()}
	{/if}
</div>

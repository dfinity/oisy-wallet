<script lang="ts">
	import { Collapsible } from '@dfinity/gix-components';
	import AddressName from '$lib/components/address/AddressName.svelte';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import Avatar from '$lib/components/contact/Avatar.svelte';
	import ButtonCopyAddress from '$lib/components/contact/ButtonCopyAddress.svelte';
	import type { Contact } from '$lib/types/contact';
	import { shortenAddress } from '$lib/utils/address.utils';

	const { contact, initiallyExpanded = false }: { contact: Contact; initiallyExpanded?: boolean } =
		$props();
</script>

{#snippet description()}
	{#each contact.addresses as address, i (address.address)}
		{#if i !== 0}&nbsp;•&nbsp;{/if}
		<span
			class:font-bold={contact.addresses.length === 1}
			class:text-primary={contact.addresses.length === 1}><AddressName {address} /></span
		>
	{/each}
	{#if contact.addresses.length === 1}
		&nbsp;{shortenAddress(contact.addresses[0].address)}
	{/if}
{/snippet}

{#snippet badge()}
	{#if contact.addresses.length > 0}
		<span class="md:size-5.5 absolute -bottom-1 -right-1 size-5 rounded-full bg-primary">
			{#if contact.addresses.length === 1}
				<IconAddressType size="100%" addressType={contact.addresses[0].address_type} />
			{:else}
				<div
					class="border-1 flex size-full items-center justify-center rounded-full border-secondary text-xs font-bold"
					>{contact.addresses.length}</div
				>
			{/if}
		</span>
	{/if}
{/snippet}

{#snippet header()}
	<div class="flex items-center gap-3">
		<div class="relative">
			<Avatar name={contact.name} variant="xs" styleClass="md:text-[19.2px]"></Avatar>
			{@render badge()}
		</div>
		<div>
			<div class="text-base font-bold md:text-lg">{contact.name}</div>
			<div class="text-xs text-tertiary md:text-sm">{@render description()}</div>
		</div>
		<div class="flex-grow"></div>
		<div class="flex size-7 justify-center p-1 text-brand-primary md:size-10 md:p-2">
			{#if contact.addresses.length === 1}
				<ButtonCopyAddress address={contact.addresses[0]}></ButtonCopyAddress>
			{/if}
		</div>
	</div>
{/snippet}

<div class="hover:bg-brand-primary/10 flex w-full flex-col rounded-xl p-2">
	{#if contact.addresses.length > 1}
		<Collapsible iconSize="medium" {initiallyExpanded}>
			<div slot="header">
				{@render header()}
			</div>
			<div class="flex flex-col gap-1.5 md:pl-20">
				{#each contact.addresses as address (address.address)}
					<AddressListItem {address}></AddressListItem>
				{/each}
			</div>
		</Collapsible>
	{:else}
		{@render header()}
	{/if}
</div>

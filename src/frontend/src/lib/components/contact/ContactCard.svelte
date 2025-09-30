<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import Divider from '$lib/components/common/Divider.svelte';
	import AddressItemActions from '$lib/components/contact/AddressItemActions.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import IconExpand from '$lib/components/icons/IconExpand.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		CONTACT_CARD,
		CONTACT_CARD_BUTTON,
		CONTACT_CARD_EXPAND_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { addressBookStore } from '$lib/stores/address-book.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		contact: ContactUi;
		onClick: () => void;
		onInfo?: (addressIndex: number) => void;
		onSelect?: () => void;
		hideCopyButton?: boolean;
	}

	let { contact, onInfo, onClick, onSelect, hideCopyButton = false }: Props = $props();

	let toggleContent = $state<() => void | undefined>();

	let singleAddress = $derived(contact.addresses.length === 1);
	let multipleAddresses = $derived(contact.addresses.length > 1);

	let expanded = $derived($addressBookStore.expandedContacts.includes(contact.id));
</script>

{#snippet header()}
	<LogoButton condensed hover={false} {onClick} styleClass="group" testId={CONTACT_CARD_BUTTON}>
		{#snippet logo()}
			<span class="pr-2">
				<AvatarWithBadge badge={{ type: 'addressTypeOrCount' }} {contact} variant="sm" />
			</span>
		{/snippet}

		{#snippet title()}
			{contact.name}
		{/snippet}

		{#snippet description()}
			<span class="block w-full truncate">
				{#each contact.addresses as address, index (index)}
					{#if index !== 0}
						<Divider />
					{/if}
					<span class:font-bold={singleAddress} class:text-primary={singleAddress}
						>{$i18n.address.types[address.addressType]}</span
					>
				{/each}
				{#if singleAddress}
					&nbsp;{shortenWithMiddleEllipsis({ text: contact.addresses[0].address })}
				{/if}
			</span>
		{/snippet}

		{#snippet action()}
			{#if nonNullish(onSelect)}
				<Button
					ariaLabel={$i18n.core.text.select}
					link
					onclick={onSelect}
					styleClass="hidden group-hover:block">{$i18n.core.text.select}</Button
				>
			{/if}
			{#if singleAddress && nonNullish(onInfo)}
				<AddressItemActions
					address={contact.addresses[0]}
					onInfo={() => onInfo(0)}
					styleClass="ml-auto"
				/>
			{:else if multipleAddresses}
				<ButtonIcon
					ariaLabel={expanded
						? $i18n.address_book.alt.hide_addresses
						: $i18n.address_book.alt.show_addresses_of_contact}
					colorStyle="tertiary-alt"
					height="h-8"
					link={false}
					onclick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						toggleContent?.();
						addressBookStore.toggleContact(contact.id);
					}}
					styleClass="text-primary"
					testId={CONTACT_CARD_EXPAND_BUTTON}
					transparent
					width="w-8"
				>
					{#snippet icon()}
						<IconExpand {expanded} />
					{/snippet}
				</ButtonIcon>
			{/if}
		{/snippet}
	</LogoButton>
{/snippet}

<div
	class="flex w-full flex-col rounded-xl p-2 hover:bg-brand-subtle-10"
	class:bg-brand-subtle-10={expanded}
	data-tid={CONTACT_CARD}
>
	{#if multipleAddresses}
		{@render header()}
		{#if expanded}
			<div
				class="mt-1 flex flex-col gap-1.5 md:pl-16"
				data-tid="collapsible-content"
				transition:slide={SLIDE_DURATION}
			>
				{#each contact.addresses as address, index (index)}
					<AddressListItem
						{address}
						addressItemActionsProps={nonNullish(onInfo) ? { onInfo: () => onInfo(index) } : {}}
						{hideCopyButton}
						onClick={async () =>
							await copyToClipboard({
								value: address.address,
								text: $i18n.wallet.text.address_copied
							})}
					></AddressListItem>
				{/each}
			</div>
		{/if}
	{:else}
		{@render header()}
	{/if}
</div>

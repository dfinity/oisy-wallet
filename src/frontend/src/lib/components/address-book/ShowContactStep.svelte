<script lang="ts">
	import ContactHeader from '$lib/components/address-book/ContactHeader.svelte';
	import AddressListItem from '$lib/components/contact/AddressListItem.svelte';
	import IconEmptyAddresses from '$lib/components/icons/IconEmptyAddresses.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		CONTACT_SHOW_ADD_ADDRESS_BUTTON,
		CONTACT_SHOW_CLOSE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		contact: ContactUi;
		onClose: () => void;
		onAddAddress: () => void;
		onShowAddress: (index: number) => void;
		onEdit?: (contact: ContactUi) => void;
	}

	let { contact, onClose, onEdit, onAddAddress, onShowAddress }: Props = $props();

	let hasAddresses = $derived(contact?.addresses && contact.addresses.length > 0);
</script>

<ContentWithToolbar styleClass="flex flex-col items-stretch gap-5">
	<ContactHeader name={contact.name} image={contact.image} onEdit={() => onEdit?.(contact)}
	></ContactHeader>

	{#if hasAddresses}
		<div class="flex flex-col gap-1">
			{#each contact.addresses as address, index (index)}
				<AddressListItem
					{address}
					addressItemActionsProps={{
						onInfo: () => onShowAddress(index)
					}}
					onClick={async () =>
						await copyToClipboard({
							value: address.address,
							text: $i18n.wallet.text.address_copied
						})}
				/>
			{/each}
		</div>
		<div class="flex justify-start">
			<Button
				alignLeft
				ariaLabel={$i18n.address_book.edit_contact.add_address}
				colorStyle="secondary-light"
				onclick={onAddAddress}
				transparent
			>
				<IconPlus />
				{$i18n.address_book.edit_contact.add_address}
			</Button>
		</div>
	{:else}
		<div class="mb-5 flex flex-col items-center gap-5">
			<div class="text-secondary-inverted">
				<IconEmptyAddresses />
			</div>

			<div class="text-center">
				<div class="pb-2 text-lg font-bold"
					>{$i18n.address_book.show_contact.show_address_text}
				</div>
				<div class="text-sm text-tertiary"
					>{replacePlaceholders($i18n.address_book.show_contact.add_first_address, {
						contactName: contact.name
					})}</div
				>
			</div>

			<Button
				ariaLabel={$i18n.address_book.show_contact.add_address}
				colorStyle="secondary-light"
				onclick={onAddAddress}
				testId={CONTACT_SHOW_ADD_ADDRESS_BUTTON}
				transparent
			>
				<IconPlus />
				{$i18n.address_book.show_contact.add_address}
			</Button>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={() => onClose()} testId={CONTACT_SHOW_CLOSE_BUTTON} />
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

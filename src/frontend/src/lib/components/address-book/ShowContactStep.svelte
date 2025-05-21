<script lang="ts">
	import ContactHeader from '$lib/components/address-book/ContactHeader.svelte';
	import IconEmptyAddresses from '$lib/components/icons/IconEmptyAddresses.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import {
		CONTACT_SHOW_ADD_ADDRESS_BUTTON,
		CONTACT_SHOW_CLOSE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
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
	<ContactHeader name={contact.name} onEdit={() => onEdit?.(contact)}></ContactHeader>

	{#if hasAddresses}
		<!--
		TODO: Render AddressListItems here
		https://github.com/dfinity/oisy-wallet/pull/6462
		-->
		<div>
			{#each contact.addresses as address, index (index)}
				<div class="flex items-center">
					<div class="grow">ADDRESS: {address.address} {address.label}</div>
					<Button styleClass="flex-none" on:click={() => onShowAddress(index)}>SHOW</Button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="my-5 flex flex-col items-center gap-5">
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
				styleClass="py-0"
				ariaLabel={$i18n.address_book.show_contact.add_address}
				colorStyle="tertiary-main-card"
				testId={CONTACT_SHOW_ADD_ADDRESS_BUTTON}
				on:click={onAddAddress}
			>
				<span class="flex items-center">
					<IconPlus />
				</span>
				{$i18n.address_book.show_contact.add_address}
			</Button>
		</div>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonCancel onclick={() => onClose()} testId={CONTACT_SHOW_CLOSE_BUTTON}></ButtonCancel>
	</ButtonGroup>
</ContentWithToolbar>

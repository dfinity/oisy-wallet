<script lang="ts">
	import ButtonCancel from '../ui/ButtonCancel.svelte';
	import ButtonGroup from '../ui/ButtonGroup.svelte';
	import ContentWithToolbar from '../ui/ContentWithToolbar.svelte';
	import ContactHeader from '$lib/components/address-book/ContactHeader.svelte';
	import IconEmptyAddresses from '$lib/components/icons/IconEmptyAddresses.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		CONTACT_SHOW_ADD_ADDRESS_BUTTON,
		CONTACT_SHOW_CLOSE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Contact } from '$lib/types/contact';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let { contact, close }: { contact: Contact; close: () => void } = $props();

	let hasAddresses = $derived(contact?.addresses && contact.addresses.length > 0);
</script>

<ContentWithToolbar styleClass="flex flex-col items-stretch gap-5">
	<ContactHeader name={contact.name}></ContactHeader>

	{#if hasAddresses}
		TODO Render addresses here
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
				disabled={true}
			>
				<span class="flex items-center">
					<IconPlus />
				</span>
				{$i18n.address_book.show_contact.add_address}
			</Button>
		</div>
	{/if}

	<ButtonGroup slot="toolbar">
		<ButtonCancel on:click={() => close()} testId={CONTACT_SHOW_CLOSE_BUTTON}></ButtonCancel>
	</ButtonGroup>
</ContentWithToolbar>

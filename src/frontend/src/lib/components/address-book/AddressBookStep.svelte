<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import ContactCard from '$lib/components/contact/ContactCard.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import SkeletonCards from '$lib/components/ui/SkeletonCards.svelte';
	import {
		ADDRESS_BOOK_ADD_CONTACT_BUTTON,
		ADDRESS_BOOK_SEARCH_CONTACT_INPUT
	} from '$lib/constants/test-ids.constants';
	import { contactsNotInitialized } from '$lib/derived/contacts.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactUi } from '$lib/types/contact';
	import { isDesktop } from '$lib/utils/device.utils';

	interface Props {
		contacts: ContactUi[];
		onAddContact: () => void;
		onShowAddress: ({
			contact,
			addressIndex
		}: {
			contact: ContactUi;
			addressIndex: number;
		}) => void;
		onShowContact: (contact: ContactUi) => void;
	}

	let { contacts, onAddContact, onShowContact, onShowAddress }: Props = $props();

	let searchTerm = $state('');

	let filteredContacts = $derived(
		contacts.filter(({ name: contactName, addresses }) => {
			const name = contactName.toLowerCase();
			const addressString = addresses.map(({ address }) => address).join(' ');
			const addressLabels = addresses.map(({ label }) => label?.toLowerCase()).join(' ');

			const terms = searchTerm.split(/\s+/).filter(Boolean);
			return terms.every(
				(term) =>
					name.includes(term.toLowerCase()) ||
					addressString.includes(term) ||
					addressLabels.includes(term.toLowerCase())
			);
		})
	);
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col items-stretch">
	{#if $contactsNotInitialized}
		<SkeletonCards rows={3} />
	{:else if contacts.length === 0}
		<EmptyAddressBook {onAddContact}></EmptyAddressBook>
	{:else}
		<div class="flex w-full items-end gap-2">
			<InputSearch
				autofocus={isDesktop()}
				placeholder={$i18n.address_book.text.search_contact}
				showResetButton={notEmptyString(searchTerm)}
				testId={ADDRESS_BOOK_SEARCH_CONTACT_INPUT}
				bind:filter={searchTerm}
			/>
			<Button
				ariaLabel={$i18n.address_book.text.add_contact}
				colorStyle="secondary-light"
				onclick={onAddContact}
				styleClass="rounded-xl"
				testId={ADDRESS_BOOK_ADD_CONTACT_BUTTON}
			>
				<IconPlus />
				<span class="hidden whitespace-nowrap xs:block">{$i18n.address_book.text.add_contact}</span
				></Button
			>
		</div>

		<List noPadding styleClass="py-6">
			{#if filteredContacts.length > 0}
				{#each filteredContacts as contact, index (index)}
					<ListItem>
						<ContactCard
							{contact}
							onClick={() => onShowContact(contact)}
							onInfo={(addressIndex) => onShowAddress({ contact, addressIndex })}
						/>
					</ListItem>
				{/each}
			{:else}
				<ListItem>
					<span class="text-secondary">{$i18n.address_book.text.no_contact_found}</span>
				</ListItem>
			{/if}
		</List>
	{/if}

	{#snippet toolbar()}
		<ButtonCloseModal />
	{/snippet}
</ContentWithToolbar>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import ContactCard from '$lib/components/contact/ContactCard.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		onCreateContact?: () => void;
		onSelectContact: (contact: ContactUi) => void;
		onClose: () => void;
	}

	const { onCreateContact, onSelectContact, onClose }: Props = $props();

	let inputValue: string = $state('');
	let modalData = $derived($modalStore?.data as AddressBookModalParams);
	let address: string | undefined = $derived(
		modalData.entrypoint && modalData.entrypoint.type === AddressBookSteps.SAVE_ADDRESS
			? modalData.entrypoint.address
			: undefined
	);

	let filteredContacts = $derived(
		$contacts.filter((c) => c.name.toLowerCase().includes(inputValue.toLowerCase()))
	);
</script>

<ContentWithToolbar>
	{#if nonNullish(address)}
		<AddressCard items="center" variant="info">
			{#snippet logo()}
				<AvatarWithBadge {address} badge={{ type: 'addressType', address }} variant="sm" />
			{/snippet}
			{#snippet content()}
				<span class="truncate">{address}</span>
			{/snippet}
		</AddressCard>
	{/if}

	<div class="mt-8 flex justify-between">
		<h5>{$i18n.address.save.add_to_existing_contact}</h5>
		{#if nonNullish(onCreateContact)}
			<span class="flex">
				<Button
					ariaLabel={$i18n.address.save.create_contact}
					link
					onclick={onCreateContact}
					paddingSmall><IconPlus /> {$i18n.address.save.create_contact}</Button
				>
			</span>
		{/if}
	</div>

	<div class="input-field condensed mt-3 flex w-full">
		<!-- We add "search" in the inputs name to prevent browsers form displaying autofill, see: -->
		<!-- https://stackoverflow.com/a/68260636/2244209 -->
		<!-- Additionally, we have to avoid placeholders with word "name" as that can bring autofill as well -->
		<InputTextWithAction
			name="search_contacts"
			autofocus
			placeholder={$i18n.address_book.text.search_contact}
			bind:value={inputValue}
		/>
	</div>

	{#if filteredContacts.length > 0}
		<List noPadding styleClass="mt-5">
			{#each filteredContacts as contact, index (`${index}-${contact.id}`)}
				<ListItem>
					<ContactCard
						{contact}
						hideCopyButton
						onClick={() => onSelectContact(contact)}
						onSelect={() => onSelectContact(contact)}
					/>
				</ListItem>
			{/each}
		</List>
	{:else}
		<EmptyState title={$i18n.address_book.text.no_contact_found} />
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<Button
				colorStyle="secondary-light"
				fullWidth
				onclick={() => onClose()}
				paddingSmall
				type="button">{$i18n.core.text.close}</Button
			>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>

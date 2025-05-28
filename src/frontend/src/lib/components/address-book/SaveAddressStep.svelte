<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import AddressCard from '$lib/components/address/AddressCard.svelte';
	import type { AddressBookModalParams } from '$lib/types/address-book';
	import AvatarWithBadge from '$lib/components/contact/AvatarWithBadge.svelte';
	import { AddressBookSteps } from '$lib/enums/progress-steps';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { i18n } from '$lib/stores/i18n.store';
	import Button from '$lib/components/ui/Button.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import SlidingInput from '$lib/components/ui/SlidingInput.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import { contacts } from '$lib/derived/contacts.derived';
	import ContactCard from '$lib/components/contact/ContactCard.svelte';

	let inputValue: string = $state('');

	let modalData = $derived($modalStore?.data as AddressBookModalParams);
	let address: string | undefined = $derived(
		modalData.step && modalData.step.type === AddressBookSteps.SAVE_ADDRESS
			? modalData.step.address
			: undefined
	);
</script>

{#if nonNullish(address)}
	<AddressCard>
		{#snippet logo()}
			<AvatarWithBadge {address} badge={{ type: 'addressType', address }} />
		{/snippet}
		{#snippet content()}
			{address}
		{/snippet}
	</AddressCard>
{/if}

<div class="mt-8 flex justify-between">
	<h5>{$i18n.address.save.add_to_existing_contact}</h5>
	<span class="flex">
		<Button
			link
			paddingSmall
			on:click={() => {
				modalStore.openAddressBook({
					id: Symbol(),
					data: { step: { type: AddressBookSteps.ADD_CONTACT } }
				});
			}}><IconPlus /> {$i18n.address.save.create_contact}</Button
		>
	</span>
</div>

<div class="input-field condensed flex w-full">
	<!-- We add "search" in the inputs name to prevent browsers form displaying autofill, see: -->
	<!-- https://stackoverflow.com/a/68260636/2244209 -->
	<!-- Additionally, we have to avoid placeholders with word "name" as that can bring autofill as well -->
	<InputTextWithAction
		name="search_slidingInput"
		placeholder={$i18n.address_book.text.search_contact}
		bind:value={inputValue}
		autofocus
	/>
</div>

<List>
	{#each $contacts.filter((c) => c.name
			.toLowerCase()
			.includes(inputValue.toLowerCase())) as contact, index (contact.id)}
		<ListItem>
			<ContactCard {contact} onClick={() => {}} onInfo={() => {}} />
		</ListItem>
	{/each}
</List>

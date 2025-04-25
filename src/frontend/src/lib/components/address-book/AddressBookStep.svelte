<script lang="ts">
	import EmptyAddressBook from '$lib/components/address-book/EmptyAddressBook.svelte';
	import ButtonCloseModal from '$lib/components/ui/ButtonCloseModal.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import type { Contact } from '$lib/types/contact';

	let { contacts }: { contacts: Contact[] } = $props();
</script>

<ContentWithToolbar styleClass="mx-2 flex flex-col justify-center">
	{#if contacts.length === 0}
		<EmptyAddressBook />
	{:else}
		<div class="p-6">
			<h3>TODO Add contact list here</h3>
		</div>
	{/if}

	<ButtonCloseModal slot="toolbar" />
</ContentWithToolbar>

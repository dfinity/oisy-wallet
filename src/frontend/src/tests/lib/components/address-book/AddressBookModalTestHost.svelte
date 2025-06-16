<script lang="ts">
	import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	let modalOpen = $derived($modalStore?.type === 'address-book');
</script>

{#if modalOpen}
	<AddressBookModal />
{/if}

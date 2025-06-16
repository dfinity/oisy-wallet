<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';

	let modalOpen = $derived($modalStore?.type === 'address-book');
</script>

{#if modalOpen}
	<AddressBookModal />
{/if}

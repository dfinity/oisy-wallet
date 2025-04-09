<script lang="ts">
	import ContactItem from '$lib/components/address-book/ContactItem.svelte';

	const { contacts, deleteContact } = $props();
</script>

{#each contacts as contact (contact.id)}
	<ContactItem {contact}></ContactItem>
{/each}

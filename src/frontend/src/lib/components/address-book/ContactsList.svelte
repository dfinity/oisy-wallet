<script lang="ts">
	import ContactItem from '$lib/components/address-book/ContactItem.svelte';

	const { contacts, deleteContact } = $props();
</script>

<div class="flex flex-col gap-4">
	{#each contacts as contact (contact.id)}
		<ContactItem {contact}></ContactItem>
	{/each}
</div>

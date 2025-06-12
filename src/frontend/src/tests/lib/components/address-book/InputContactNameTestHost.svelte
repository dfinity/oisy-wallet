<script lang="ts">
	import type { ContactUi } from '$lib/types/contact';
	import InputContactName from '$lib/components/address-book/InputContactName.svelte';

	let {
		contact = $bindable(),
		disabled,
		isValid = $bindable()
	}: {
		contact: Partial<ContactUi>;
		disabled?: boolean;
		isValid: boolean;
	} = $props();

	// Expose the isValid value for testing
	export const getIsValid = () => isValid;
	export const getContact = () => contact;
</script>

<InputContactName bind:contact bind:isValid {disabled} />

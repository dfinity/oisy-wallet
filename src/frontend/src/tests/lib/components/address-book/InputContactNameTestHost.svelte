<script lang="ts">
	import InputContactName from '$lib/components/address-book/InputContactName.svelte';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		contact: Partial<ContactUi>;
		disabled?: boolean;
		isValid: boolean;
	}

	let { contact = $bindable(), disabled, isValid = $bindable() }: Props = $props();

	// Expose the isValid value for testing
	export const getIsValid = () => isValid;
</script>

<InputContactName {disabled} bind:contact bind:isValid />

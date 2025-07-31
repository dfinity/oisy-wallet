<script lang="ts">
	import InputAddressAlias from '$lib/components/address/InputAddressAlias.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	let {
		address = $bindable(),
		disableAddressField,
		isValid = $bindable()
	}: {
		address: Partial<ContactAddressUi>;
		disableAddressField?: boolean;
		isValid: boolean;
	} = $props();

	// Expose the isValid value for testing
	export const getIsValid = () => isValid;
	export const getAddress = () => address;
</script>

<InputAddressAlias {disableAddressField} bind:address bind:isValid />

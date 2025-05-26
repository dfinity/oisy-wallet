<script lang="ts">
	import AddressForm from '$lib/components/address/AddressForm.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	let {
		address = $bindable(),
		isNewAddress,
		isInvalid = $bindable()
	}: {
		address: Partial<ContactAddressUi>;
		isNewAddress: boolean;
		isInvalid: boolean;
	} = $props();

	// Expose the isInvalid value for testing
	export const getIsInvalid = () => isInvalid;
</script>

<AddressForm bind:address bind:isInvalid {isNewAddress} />

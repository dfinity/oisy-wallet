<script lang="ts">
	import AddressForm from '$lib/components/address/AddressForm.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	let {
		address = $bindable(),
		disableAddressField,
		isInvalid = $bindable()
	}: {
		address: Partial<ContactAddressUi>;
		disableAddressField?: boolean;
		isInvalid: boolean;
	} = $props();

	// Expose the isInvalid value for testing
	export const getIsInvalid = () => isInvalid;
	export const getAddress = () => address;
</script>

<AddressForm bind:address bind:isInvalid {disableAddressField} />

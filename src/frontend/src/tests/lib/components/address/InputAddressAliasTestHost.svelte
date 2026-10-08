<script lang="ts">
	import InputAddressAlias from '$lib/components/address/InputAddressAlias.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	interface Props {
		address: Partial<ContactAddressUi>;
		disableAddressField?: boolean;
		isValid: boolean;
	}

	let { address: addressProp, disableAddressField, isValid = $bindable() }: Props = $props();

	// Wrap the incoming prop in deep-reactive state so chained $effects in the
	// child component (e.g. label trimming, addressType derivation) propagate
	// through `bind:address`. Required since `@testing-library/svelte` 5.3
	// initialises props with `$state.raw`, which is shallow. We only consume
	// the initial value of `addressProp` on purpose.
	// svelte-ignore state_referenced_locally
	let address = $state(addressProp);

	// Expose the isValid value for testing
	export const getIsValid = () => isValid;
	export const getAddress = () => address;
</script>

<InputAddressAlias {disableAddressField} bind:address bind:isValid />

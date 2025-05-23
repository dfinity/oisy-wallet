<script lang="ts">
	import InputText from '$lib/components/ui/InputText.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	let { address = $bindable() }: { address: Partial<ContactAddressUi> } = $props();

	// TODO Implement form with proper validation
</script>

<form class="w-full">
	<label for="address" class="">Address</label>
	<InputText name="address" bind:value={address.address} placeholder=""></InputText>

	<label for="label">Label</label>
	<InputText name="label" bind:value={address.label} placeholder="" />
</form>

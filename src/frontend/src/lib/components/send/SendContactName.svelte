<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import Divider from '$lib/components/common/Divider.svelte';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';

	interface Props {
		address: Address;
		contact: ContactUi;
	}

	let { contact, address }: Props = $props();

	let contactLabel = $derived(
		nonNullish(contact)
			? contact.addresses.find(({ address: innerAddress }) => address === innerAddress)?.label
			: undefined
	);
</script>

{contact.name}

{#if notEmptyString(contactLabel)}
	<Divider />
	{contactLabel}
{/if}

<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import Divider from '$lib/components/common/Divider.svelte';
	import type { Address } from '$lib/types/address';
	import type { ContactUi } from '$lib/types/contact';
	import { filterAddressFromContact } from '$lib/utils/contact.utils';

	interface Props {
		address: Address;
		contact: ContactUi;
		children?: Snippet;
	}

	let { contact, address, children }: Props = $props();

	let contactLabel = $derived(filterAddressFromContact({ contact, address })?.label);
</script>

<span class="font-bold">
	{@render children?.()}
	{contact.name}

	{#if notEmptyString(contactLabel)}
		<Divider />
		{contactLabel}
	{/if}
</span>

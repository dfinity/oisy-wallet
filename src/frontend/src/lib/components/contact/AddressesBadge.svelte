<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';

	interface Props {
		addresses: ContactAddressUi[];
		selectedAddress?: string;
	}

	let { addresses, selectedAddress }: Props = $props();

	const selectedAddressType: TokenAccountIdTypes | undefined = $derived(
		addresses.find((a) => a.address === selectedAddress)?.addressType
	);
</script>

{#if addresses.length > 0}
	<span class="bg-primary absolute -right-1 -bottom-1 z-0 size-5 rounded-full md:size-5.5">
		{#if nonNullish(selectedAddress) && nonNullish(selectedAddressType)}
			<IconAddressType addressType={selectedAddressType} />
		{:else if addresses.length === 1}
			<IconAddressType addressType={addresses[0].addressType} />
		{:else}
			<div
				class="border-secondary flex size-full items-center justify-center rounded-full border-1 text-xs font-bold"
				>{addresses.length}</div
			>
		{/if}
	</span>
{/if}

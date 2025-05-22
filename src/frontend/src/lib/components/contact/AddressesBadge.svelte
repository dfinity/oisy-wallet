<script lang="ts">
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import type { ContactAddressUi } from '$lib/types/contact';

	interface Props {
		addresses: ContactAddressUi[];
	}

	let { addresses }: Props = $props();
</script>

{#if addresses.length > 0}
	<span class="md:size-5.5 absolute -bottom-1 -right-1 size-5 rounded-full bg-primary">
		{#if addresses.length == 1}
			<IconAddressType addressType={addresses[0].addressType} />
		{:else}
			<div
				class="border-1 flex size-full items-center justify-center rounded-full border-secondary text-xs font-bold"
				>{addresses.length}</div
			>
		{/if}
	</span>
{/if}

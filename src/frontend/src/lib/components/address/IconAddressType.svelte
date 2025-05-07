<script lang="ts">
	import IconAddressTypeBTC from '$lib/components/icons/IconAddressTypeBTC.svelte';
	import IconAddressTypeETH from '$lib/components/icons/IconAddressTypeETH.svelte';
	import IconAddressTypeICP from '$lib/components/icons/IconAddressTypeICP.svelte';
	import IconAddressTypeSOL from '$lib/components/icons/IconAddressTypeSOL.svelte';
	import type { AddressType } from '$lib/types/address';

	let { addressType, size }: { addressType: AddressType; size?: string } = $props();
</script>

{#if addressType === 'ICP'}
	<IconAddressTypeICP {size} />
{:else if addressType === 'BTC'}
	<IconAddressTypeBTC {size} />
{:else if addressType === 'ETH'}
	<IconAddressTypeETH {size} />
{:else if addressType === 'SOL'}
	<IconAddressTypeSOL {size} />
{/if}

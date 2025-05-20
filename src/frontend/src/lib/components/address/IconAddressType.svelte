<script lang="ts">
	import IconAddressTypeBtc from '$lib/components/icons/IconAddressTypeBtc.svelte';
	import IconAddressTypeEth from '$lib/components/icons/IconAddressTypeEth.svelte';
	import IconAddressTypeIcrc2 from '$lib/components/icons/IconAddressTypeIcrc2.svelte';
	import IconAddressTypeSol from '$lib/components/icons/IconAddressTypeSol.svelte';
	import type { AddressType } from '$lib/types/address';

	let { addressType, size }: { addressType: AddressType; size?: string } = $props();
</script>

<span class="border-1 rounded-full border-primary bg-primary">
	{#if addressType === 'Icrc2'}
		<IconAddressTypeIcrc2 {size} />
	{:else if addressType === 'Btc'}
		<IconAddressTypeBtc {size} />
	{:else if addressType === 'Eth'}
		<IconAddressTypeEth {size} />
	{:else if addressType === 'Sol'}
		<IconAddressTypeSol {size} />
	{/if}
</span>

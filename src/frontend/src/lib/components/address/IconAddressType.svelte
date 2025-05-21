<script lang="ts">
	import IconAddressTypeBtc from '$lib/components/icons/IconAddressTypeBtc.svelte';
	import IconAddressTypeEth from '$lib/components/icons/IconAddressTypeEth.svelte';
	import IconAddressTypeIcrc2 from '$lib/components/icons/IconAddressTypeIcrcv2.svelte';
	import IconAddressTypeSol from '$lib/components/icons/IconAddressTypeSol.svelte';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';

	let { addressType, size }: { addressType: TokenAccountIdTypes; size?: string } = $props();
</script>

<div class="border-1 box-content rounded-full border-primary bg-primary">
	{#if addressType === 'Icrcv2'}
		<IconAddressTypeIcrc2 {size} />
	{:else if addressType === 'Btc'}
		<IconAddressTypeBtc {size} />
	{:else if addressType === 'Eth'}
		<IconAddressTypeEth {size} />
	{:else if addressType === 'Sol'}
		<IconAddressTypeSol {size} />
	{/if}
</div>

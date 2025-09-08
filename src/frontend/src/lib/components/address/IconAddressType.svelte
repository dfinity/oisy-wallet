<script lang="ts">
	import IconAddressTypeBtc from '$lib/components/icons/IconAddressTypeBtc.svelte';
	import IconAddressTypeEth from '$lib/components/icons/IconAddressTypeEth.svelte';
	import IconAddressTypeIcrc2 from '$lib/components/icons/IconAddressTypeIcrcv2.svelte';
	import IconAddressTypeSol from '$lib/components/icons/IconAddressTypeSol.svelte';
	import type { TokenAccountIdTypes } from '$lib/types/token-account-id';

	interface Props {
		addressType: TokenAccountIdTypes;
		size?: string;
		transparent?: boolean;
	}

	let { addressType, size, transparent = false }: Props = $props();
</script>

{#snippet icon()}
	{#if addressType === 'Icrcv2'}
		<IconAddressTypeIcrc2 {size} />
	{:else if addressType === 'Btc'}
		<IconAddressTypeBtc {size} />
	{:else if addressType === 'Eth'}
		<IconAddressTypeEth {size} />
	{:else if addressType === 'Sol'}
		<IconAddressTypeSol {size} />
	{/if}
{/snippet}

{#if transparent}
	{@render icon()}
{:else}
	<div class="border-1 box-content rounded-full border-primary bg-primary">
		{@render icon()}
	</div>
{/if}

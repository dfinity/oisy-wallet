<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AddressName from '$lib/components/address/AddressName.svelte';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import ButtonCopyAddress from '$lib/components/contact/ButtonCopyAddress.svelte';
	import type { Address } from '$lib/types/contact';
	import { shortenAddress } from '$lib/utils/address.utils';

	const { address, select }: { address: Address; select?: (address: Address) => void } = $props();

	let shortAddress = $derived(shortenAddress(address.address));
</script>

<button
	onclick={() => select?.(address)}
	disabled={nonNullish(select)}
	class="hover:bg-brand-primary/10 flex w-full items-center gap-3 rounded-xl bg-white p-2 text-left"
>
	<IconAddressType addressType={address.address_type} size="32" />
	<div class="text-xs md:text-sm">
		<div class="text-tertiary">
			<span class="text-sm font-bold text-primary md:text-base"><AddressName {address} /></span>
		</div>
		<div>
			<span>{shortAddress}</span>
		</div>
	</div>
	<div class="flex-grow"></div>
	<div class="flex size-7 justify-center p-1 text-brand-primary md:size-10 md:p-2">
		<ButtonCopyAddress {address}></ButtonCopyAddress>
	</div>
</button>

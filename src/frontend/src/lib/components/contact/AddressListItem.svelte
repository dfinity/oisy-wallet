<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import AddressName from '$lib/components/address/AddressName.svelte';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressItemActions from '$lib/components/ui/AddressItemActions.svelte';
	import type { Address } from '$lib/types/contact';
	import { shortenAddress } from '$lib/utils/address.utils';

	interface Props {
		address: Address;
		showInfoButton?: boolean;
		oninfo?: () => void;
		onclick?: () => void;
		styleClass?: string;
		showFullAddress?: boolean;
	}
	const {
		address,
		onclick,
		oninfo,
		showInfoButton = false,
		styleClass = '',
		showFullAddress = false
	}: Props = $props();

	let displayAddress = $derived(
		showFullAddress ? address.address : shortenAddress(address.address)
	);
</script>

<button
	onclick={() => onclick?.()}
	disabled={nonNullish(onclick)}
	class={`flex w-full items-center gap-3 rounded-xl bg-white p-2 text-left hover:bg-brand-subtle-10 ${styleClass}`}
>
	<IconAddressType addressType={address.address_type} size="32" />
	<div class="text-xs md:text-sm">
		<div class="flex items-center gap-1 text-tertiary">
			<span class="pr-1 text-sm font-bold text-primary md:text-base"><AddressName {address} /></span
			>
		</div>
		<div class="flex items-center gap-1">
			{#if notEmptyString(address.alias)}
				<span class="font-bold">{address.alias}</span>
				<span class="text-[0.5rem]">•</span>
			{/if}
			<span>{displayAddress}</span>
		</div>
	</div>
	<AddressItemActions styleClass="ml-auto" {address} {showInfoButton} {oninfo} />
</button>

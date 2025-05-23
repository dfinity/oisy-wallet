<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressItemActions from '$lib/components/contact/AddressItemActions.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address: ContactAddressUi;
		onInfo?: () => void;
		onClick?: () => void;
		styleClass?: string;
		showFullAddress?: boolean;
		showTypeOnTop?: boolean;
	}
	let {
		address,
		onClick,
		onInfo,
		styleClass = '',
		showFullAddress = false,
		showTypeOnTop = false
	}: Props = $props();

	let displayAddress = $derived(
		showFullAddress ? address.address : shortenWithMiddleEllipsis({ text: address.address })
	);
</script>

{#if showTypeOnTop}
	<label class="block font-bold" for="address">
		{$i18n.address.types[address.addressType]}
	</label>
{/if}

<button
	id="address"
	onclick={() => onClick?.()}
	disabled={nonNullish(onClick)}
	class={`flex w-full items-center gap-3 rounded-xl bg-primary p-2 text-left hover:bg-brand-subtle-10 ${styleClass}`}
>
	<IconAddressType addressType={address.addressType} size="32" />

	<div class="text-xs md:text-sm">
		{#if !showTypeOnTop}
			<div class="flex items-center gap-1 text-tertiary">
				<span class="pr-1 text-sm font-bold text-primary md:text-base">
					{$i18n.address.types[address.addressType]}
				</span>
			</div>
		{/if}

		<div class="text-xs md:text-sm">
			{#if !showTypeOnTop}
				<div class="flex items-center gap-1 text-tertiary">
					{#if notEmptyString(address.label)}
						<span class="font-bold">{address.label}</span>
						<span class="text-[0.5rem]">•</span>
					{/if}
				</div>
			{:else}
				<div class="flex items-center gap-1 text-tertiary">
					{#if notEmptyString(address.label)}
						<span class="font-bold">{address.label}</span>
					{/if}
				</div>
			{/if}
			<div class="flex items-center gap-1 break-all text-sm">
				<span>{displayAddress}</span>
			</div>
		</div>
	</div>

	<AddressItemActions {address} {onInfo} styleClass="ml-auto items-center" />
</button>

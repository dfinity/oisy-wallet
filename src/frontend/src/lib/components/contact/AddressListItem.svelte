<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import AddressItemActions, {
		type Props as AddressItemActionsProps
	} from '$lib/components/contact/AddressItemActions.svelte';
	import { ADDRESS_LIST_ITEM_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';
	import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';

	interface Props {
		address: ContactAddressUi;
		onClick?: () => void;
		styleClass?: string;
		showFullAddress?: boolean;
		addressItemActionsProps?: Omit<AddressItemActionsProps, 'address'>;
		hideCopyButton?: boolean;
	}

	let {
		address,
		onClick,
		styleClass = '',
		showFullAddress = false,
		addressItemActionsProps,
		hideCopyButton = false
	}: Props = $props();

	let displayAddress = $derived(
		showFullAddress ? address.address : shortenWithMiddleEllipsis({ text: address.address })
	);
</script>

<!-- Without onClick (the edit-contact list) tapping the row does nothing, so it shows no
     hover or pressed fill; only its Edit and Delete icons act. -->
<button
	class={`flex w-full items-center gap-3 rounded-xl bg-primary p-2 text-left ${styleClass}`}
	class:row-feedback={nonNullish(onClick)}
	data-tid={ADDRESS_LIST_ITEM_BUTTON}
	onclick={() => onClick?.()}
>
	<IconAddressType addressType={address.addressType} size="32" />

	<div class="text-xs md:text-sm">
		<div class="flex items-center gap-1 text-tertiary">
			<span class="pr-1 text-sm font-bold text-primary md:text-base">
				{$i18n.address.types[address.addressType]}
			</span>
		</div>
		<div class="flex items-center gap-1">
			{#if notEmptyString(address.label)}
				<span class="font-bold">{address.label}</span>
				<span class="text-[0.5rem]">•</span>
			{/if}
			<span>{displayAddress}</span>
		</div>
	</div>
	<AddressItemActions
		{address}
		{hideCopyButton}
		styleClass="ml-auto items-center"
		{...addressItemActionsProps}
	/>
</button>

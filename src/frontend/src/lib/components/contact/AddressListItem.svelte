<script lang="ts">
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import AddressName from '$lib/components/address/AddressName.svelte';
	import IconAddressType from '$lib/components/address/IconAddressType.svelte';
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import {
		ADDRESS_LIST_ITEM_COPY_BUTTON,
		ADDRESS_LIST_ITEM_INFO_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/contact';
	import { shortenAddress } from '$lib/utils/address.utils';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

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
	<div class="ml-auto flex">
		<ButtonIcon
			styleClass="-m-1 md:m-0"
			ariaLabel={$i18n.core.text.copy}
			testId={ADDRESS_LIST_ITEM_COPY_BUTTON}
			on:click={() =>
				copyToClipboard({ text: $i18n.wallet.text.address_copied, value: address.address })}
		>
			<IconCopy slot="icon" />
		</ButtonIcon>
		{#if showInfoButton && nonNullish(oninfo)}
			<ButtonIcon
				styleClass="-m-1 md:m-0"
				ariaLabel={$i18n.core.text.view}
				testId={ADDRESS_LIST_ITEM_INFO_BUTTON}
				on:click={oninfo}><IconInfo slot="icon" /></ButtonIcon
			>
		{/if}
	</div>
</button>

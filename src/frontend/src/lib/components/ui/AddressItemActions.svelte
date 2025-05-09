<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconCopy from '$lib/components/icons/IconCopy.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import {
		ADDRESS_LIST_ITEM_COPY_BUTTON,
		ADDRESS_LIST_ITEM_INFO_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Address } from '$lib/types/contact';
	import { copyToClipboard } from '$lib/utils/clipboard.utils';

	interface Props {
		address: Address;
		showInfoButton?: boolean;
		oninfo?: () => void;
		styleClass?: string;
	}
	const { address, oninfo, showInfoButton = false, styleClass = '' }: Props = $props();
</script>

<div class={`flex ${styleClass}`}>
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

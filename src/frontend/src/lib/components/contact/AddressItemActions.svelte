<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconCircleMinus from '$lib/components/icons/lucide/IconCircleMinus.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Copy from '$lib/components/ui/Copy.svelte';
	import {
		ADDRESS_LIST_ITEM_COPY_BUTTON,
		ADDRESS_LIST_ITEM_DELETE_BUTTON,
		ADDRESS_LIST_ITEM_EDIT_BUTTON,
		ADDRESS_LIST_ITEM_INFO_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ContactAddressUi } from '$lib/types/contact';

	export interface Props {
		address: ContactAddressUi;
		onInfo?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
		hideCopyButton?: boolean;
		styleClass?: string;
	}
	let {
		address,
		onInfo,
		onEdit,
		onDelete,
		hideCopyButton = false,
		styleClass = ''
	}: Props = $props();
</script>

<div class={`flex ${styleClass}`}>
	{#if !hideCopyButton}
		<Copy
			testId={ADDRESS_LIST_ITEM_COPY_BUTTON}
			text={$i18n.wallet.text.address_copied}
			value={address.address}
			colorStyle="tertiary-alt"
			transparent
			link={false}
		/>
	{/if}
	{#if nonNullish(onInfo)}
		<ButtonIcon
			styleClass="-m-1 md:m-0"
			colorStyle="tertiary-alt"
			link={false}
			transparent
			ariaLabel={$i18n.core.text.view}
			testId={ADDRESS_LIST_ITEM_INFO_BUTTON}
			onclick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onInfo();
			}}
		>
			{#snippet icon()}
				<IconInfo />
			{/snippet}
		</ButtonIcon>
	{/if}
	{#if nonNullish(onEdit)}
		<ButtonIcon
			styleClass="-m-1 md:m-0"
			colorStyle="tertiary-alt"
			link={false}
			transparent
			ariaLabel={$i18n.core.text.edit}
			testId={ADDRESS_LIST_ITEM_EDIT_BUTTON}
			onclick={onEdit}
		>
			{#snippet icon()}
				<IconPencil />
			{/snippet}
		</ButtonIcon>
	{/if}
	{#if nonNullish(onDelete)}
		<ButtonIcon
			styleClass="-m-1 md:m-0"
			colorStyle="error"
			link={false}
			transparent
			ariaLabel={$i18n.core.text.delete}
			testId={ADDRESS_LIST_ITEM_DELETE_BUTTON}
			onclick={onDelete}
		>
			{#snippet icon()}
				<IconCircleMinus />
			{/snippet}
		</ButtonIcon>
	{/if}
</div>

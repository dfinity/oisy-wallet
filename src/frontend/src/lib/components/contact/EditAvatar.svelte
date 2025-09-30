<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		CONTACT_POPOVER_TRIGGER,
		CONTACT_POPOVER_MENU,
		CONTACT_POPOVER_MENU_ITEM,
		CONTACT_REPLACE_MENU_ITEM,
		CONTACT_REMOVE_MENU_ITEM
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		fileInput?: HTMLInputElement;
		onReplaceImage: () => void;
		onRemoveImage: () => void;
		imageUrl?: string | null;
	}

	const {
		fileInput = $bindable<HTMLInputElement | undefined>(),
		onReplaceImage,
		onRemoveImage,
		imageUrl
	}: Props = $props();

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const items = $derived(
		nonNullish(imageUrl)
			? [
					{
						logo: IconImage,
						title: $i18n.address_book.edit_avatar.replace_image,
						action: onReplaceImage,
						testId: CONTACT_REPLACE_MENU_ITEM
					},
					{
						logo: IconTrash,
						title: $i18n.address_book.edit_avatar.remove_image,
						action: onRemoveImage,
						testId: CONTACT_REMOVE_MENU_ITEM
					}
				]
			: [
					{
						logo: IconImage,
						title: $i18n.address_book.edit_avatar.upload_image,
						action: onReplaceImage,
						testId: CONTACT_REPLACE_MENU_ITEM
					}
				]
	);
</script>

<ButtonIcon
	ariaLabel={$i18n.address_book.edit_avatar.replace_image}
	colorStyle="tertiary-alt"
	link={false}
	onclick={() => (visible = true)}
	styleClass="w-auto h-auto p-0"
	testId={CONTACT_POPOVER_TRIGGER}
	transparent
	bind:button
>
	{#snippet icon()}
		<IconPencil />
	{/snippet}
</ButtonIcon>

<Popover anchor={button} invisibleBackdrop bind:visible>
	<div
		class="avatar-edit-popover min-w-60 max-w-[60%] text-left"
		data-tid={CONTACT_POPOVER_MENU}
		role="menu"
	>
		<h3 class="popover-title pb-2 pt-1 text-base">{$i18n.address_book.edit_avatar.menu_title}</h3>
		<ul class="flex flex-col">
			{#each items as { title: itemTitle, logo: ItemLogo, action, testId } (itemTitle)}
				<li class="logo-button-list-item">
					<LogoButton
						hover
						onClick={() => {
							action();
							visible = false;
						}}
						styleClass="w-full"
						testId={testId ?? CONTACT_POPOVER_MENU_ITEM}
					>
						{#snippet logo()}
							<ItemLogo />
						{/snippet}
						{#snippet title()}
							<span class="text-base font-normal">{itemTitle}</span>
						{/snippet}
					</LogoButton>
				</li>
			{/each}
		</ul>
	</div>
</Popover>

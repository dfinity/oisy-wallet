<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		POPOVER_TRIGGER_BUTTON,
		POPOVER_MENU,
		POPOVER_MENU_ITEM
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	const {
		fileInput = $bindable(),
		replaceImage = $bindable(),
		removeImage = $bindable(),
		imageUrl = $bindable()
	} = $props();

	let visible = $state(false);
	let button = $state<HTMLButtonElement | undefined>();

	const items = $derived(
		imageUrl
			? [
					{
						logo: IconImage,
						title: $i18n.address_book.edit_avatar.replace_image,
						action: replaceImage
					},
					{
						logo: IconTrash,
						title: $i18n.address_book.edit_avatar.remove_image,
						action: removeImage,
						testId: 'IconTrash'
					}
				]
			: [
					{
						logo: IconImage,
						title: $i18n.address_book.edit_avatar.upload_image,
						action: replaceImage
					}
				]
	);
</script>

<ButtonIcon
	bind:button
	onclick={() => (visible = true)}
	colorStyle="tertiary-alt"
	styleClass="w-auto h-auto p-0"
	transparent
	link={false}
	ariaLabel="Edit image"
	testId={POPOVER_TRIGGER_BUTTON}
>
	{#snippet icon()}
		<IconPencil />
	{/snippet}
</ButtonIcon>

<Popover bind:visible anchor={button} invisibleBackdrop>
	<div
		class="avatar-edit-popover min-w-60 max-w-[60%] text-left"
		role="menu"
		data-tid={POPOVER_MENU}
	>
		<h3 class="popover-title pb-2 pt-1 text-base">{$i18n.address_book.edit_avatar.menu_title}</h3>
		<ul class="flex flex-col">
			{#each items as item (item.title)}
				<li class="logo-button-list-item">
					<LogoButton
						hover
						styleClass="w-full"
						testId={item.testId ?? POPOVER_MENU_ITEM}
						onClick={() => {
							item.action();
							visible = false;
						}}
					>
						{#snippet logo()}
							<item.logo />
						{/snippet}
						{#snippet title()}
							<span class="text-base font-normal">{item.title}</span>
						{/snippet}
					</LogoButton>
				</li>
			{/each}
		</ul>
	</div>
</Popover>

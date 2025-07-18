<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import {
		CONTACT_POPOVER_TRIGGER,
		CONTACT_POPOVER_MENU,
		CONTACT_POPOVER_MENU_ITEM
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		fileInput: typeof $bindable;
		onReplaceImage: () => void;
		onRemoveImage: () => void;
		imageUrl: string | undefined;
	}

	const {
		fileInput = $bindable(),
		onReplaceImage = $bindable(),
		onRemoveImage = $bindable(),
		imageUrl = $bindable()
	}: Props = $props();

	let visible = $state(false);

	let button = $state<HTMLButtonElement | undefined>();

	const avatarMenuItems = imageUrl
		? [
				{
					logo: IconImage,
					title: $i18n.address_book.edit_avatar.replace_image,
					action: onReplaceImage
				},
				{
					logo: IconTrash,
					title: $i18n.address_book.edit_avatar.remove_image,
					action: onRemoveImage,
					testId: 'IconTrash'
				}
			]
		: [
				{
					logo: IconImage,
					title: $i18n.address_book.edit_avatar.upload_image,
					action: onReplaceImage
				}
			];

	const items = $derived(avatarMenuItems);
</script>

<ButtonIcon
	bind:button
	onclick={() => (visible = true)}
	colorStyle="tertiary-alt"
	styleClass="w-auto h-auto p-0"
	transparent
	link={false}
	ariaLabel={$i18n.address_book.edit_avatar.replace_image}
	testId={CONTACT_POPOVER_TRIGGER}
>
	{#snippet icon()}
		<IconPencil />
	{/snippet}
</ButtonIcon>

<Popover bind:visible anchor={button} invisibleBackdrop>
	<div
		class="avatar-edit-popover min-w-60 max-w-[60%] text-left"
		role="menu"
		data-tid={CONTACT_POPOVER_MENU}
	>
		<h3 class="popover-title pb-2 pt-1 text-base">{$i18n.address_book.edit_avatar.menu_title}</h3>
		<ul class="flex flex-col">
			{#each items as { title: itemTitle, logo: itemLogo, action, testId } (itemTitle)}
				<li class="logo-button-list-item">
					<LogoButton
						hover
						styleClass="w-full"
						testId={testId ?? CONTACT_POPOVER_MENU_ITEM}
						onClick={() => {
							action();
							visible = false;
						}}
					>
						{#snippet logo()}
							<svelte:component this={itemLogo} />
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

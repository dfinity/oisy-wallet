<script lang="ts">
	import { derived } from 'svelte/store';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import CustomPopoverMenu from '$lib/components/ui/CustomPopoverMenu.svelte';
	import { POPOVER_TRIGGER_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	const {
		fileInput = $bindable(),
		replaceImage = $bindable(),
		removeImage = $bindable(),
		avatarUrl = $bindable<string | null>()
	} = $props();

	const items = derived(avatarUrl, ($avatarUrl) =>
		$avatarUrl
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

	let menuButton = $state<HTMLButtonElement>();
</script>

<CustomPopoverMenu title={$i18n.address_book.edit_avatar.menu_title} items={$items}>
	<svelte:fragment slot="trigger" let:toggle>
		<ButtonIcon
			bind:button={menuButton}
			onclick={toggle}
			colorStyle="tertiary-alt"
			styleClass="w-auto h-auto p-0"
			transparent
			link={false}
			ariaLabel="Edit"
			testId={POPOVER_TRIGGER_BUTTON}
		>
			{#snippet icon()}
				<IconPencil />
			{/snippet}
		</ButtonIcon>
	</svelte:fragment>
</CustomPopoverMenu>

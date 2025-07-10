<script lang="ts">
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
    import { Popover } from '@dfinity/gix-components';
	import { POPOVER_TRIGGER_BUTTON } from '$lib/constants/test-ids.constants';
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
    <div class="popover-content flex flex-col divide-y"> Some Content
    {items}
</div>
</Popover>
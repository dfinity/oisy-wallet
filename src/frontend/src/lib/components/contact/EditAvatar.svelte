<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import CustomPopoverMenu from '$lib/components/ui/CustomPopoverMenu.svelte';

	const replaceImage = () => {
		// console.log('Replace clicked');
		// TODO: implement replace logic
	};
	const removeImage = () => {
		// console.log('Remove clicked');
		// TODO: implement remove logic
	};

	const items = [
		{
			logo: IconImage as typeof SvelteComponent,
			title: 'Replace',
			action: replaceImage
		},
		{
			logo: IconTrash as typeof SvelteComponent,
			title: 'Remove',
			action: removeImage
		}
	];

	let menuButton: HTMLButtonElement;
</script>

<CustomPopoverMenu title="Contact image" {items}>
	<svelte:fragment slot="trigger" let:toggle let:bindTrigger>
		<ButtonIcon
			bind:button={menuButton}
			onclick={toggle}
			colorStyle="tertiary-alt"
			styleClass="w-auto h-auto p-0"
			transparent
			link={false}
			ariaLabel="Edit"
		>
			{#snippet icon()}
				<IconPencil />
			{/snippet}
		</ButtonIcon>
	</svelte:fragment>
</CustomPopoverMenu>

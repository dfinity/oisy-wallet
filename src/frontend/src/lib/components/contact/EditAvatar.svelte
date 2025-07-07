<script lang="ts">
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import type { SvelteComponent } from 'svelte';
	import CustomPopoverMenu from '$lib/components/ui/CustomPopoverMenu.svelte';
	import type { IPopoverItem } from '$lib/components/ui/CustomPopoverMenu.svelte';

	function replaceImage() {
		console.log('Replace clicked');
	}

	function removeImage() {
		console.log('Remove clicked');
	}

	const items: IPopoverItem[] = [
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
	<svelte:fragment slot="trigger" let:toggle>
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

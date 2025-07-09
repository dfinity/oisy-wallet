<script lang="ts">
	import IconImage from '$lib/components/icons/lucide/IconImage.svelte';
	import IconPencil from '$lib/components/icons/lucide/IconPencil.svelte';
	import IconTrash from '$lib/components/icons/lucide/IconTrash.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import CustomPopoverMenu from '$lib/components/ui/CustomPopoverMenu.svelte';
	import { POPOVER_TRIGGER_BUTTON } from '$lib/constants/test-ids.constants';

	const {
		fileInput = $bindable(),
		replaceImage = $bindable(),
		removeImage = $bindable()
	} = $props();

	const items = [
		{ logo: IconImage, title: 'Replace', action: replaceImage },
		{ logo: IconTrash, title: 'Remove', action: removeImage, testId: 'IconTrash' }
	];
	let menuButton = $state<HTMLButtonElement>();
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
			testId={POPOVER_TRIGGER_BUTTON}
		>
			{#snippet icon()}
				<IconPencil />
			{/snippet}
		</ButtonIcon>
	</svelte:fragment>
</CustomPopoverMenu>

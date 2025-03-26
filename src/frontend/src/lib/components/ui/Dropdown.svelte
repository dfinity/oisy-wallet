<script lang="ts">
	import { Modal, Popover } from '@dfinity/gix-components';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';

	export let disabled = false;
	export let asModalOnMobile = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;

	let visible = false;
	let button: HTMLButtonElement | undefined;

	export const close = () => (visible = false);
</script>

<DropdownButton
	bind:button
	on:click={() => (visible = true)}
	{ariaLabel}
	{testId}
	{disabled}
	opened={visible}
>
	<slot />
</DropdownButton>

<div
	class="absolute"
	class:hidden={asModalOnMobile}
	class:md:block={asModalOnMobile}
	class:block={!asModalOnMobile}
>
	<Popover bind:visible anchor={button} invisibleBackdrop>
		<slot name="items" />
	</Popover>
</div>
<!-- Mobile dropdown displayed as modal -->
<div
	class="absolute"
	class:md:hidden={asModalOnMobile}
	class:block={asModalOnMobile}
	class:hidden={!asModalOnMobile}
>
	{#if visible}
		<Modal on:nnsClose={close}>
			<slot name="title" slot="title" />

			<slot name="items" />
		</Modal>
	{/if}
</div>

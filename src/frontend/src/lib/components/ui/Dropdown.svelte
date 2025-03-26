<script lang="ts">
	import { Modal, Popover } from '@dfinity/gix-components';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

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

{#if asModalOnMobile}
	<Responsive up="1.5md">
		<Popover bind:visible anchor={button} invisibleBackdrop>
			<slot name="items" />
		</Popover>
	</Responsive>

	<!-- Mobile dropdown displayed as modal -->

	<Responsive down="md">
		{#if visible}
			<Modal on:nnsClose={close}>
				<slot name="title" slot="title" />

				<slot name="items" />
			</Modal>
		{/if}
	</Responsive>
{:else}
	<Popover bind:visible anchor={button} invisibleBackdrop>
		<slot name="items" />
	</Popover>
{/if}

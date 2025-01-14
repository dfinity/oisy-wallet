<script lang="ts">
	import { Popover } from '@dfinity/gix-components';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';

	export let disabled = false;
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

<Popover bind:visible anchor={button} invisibleBackdrop>
	<slot name="items" />
</Popover>

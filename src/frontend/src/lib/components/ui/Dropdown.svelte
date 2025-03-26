<script lang="ts">
	import { Modal, Popover } from '@dfinity/gix-components';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { modalDropdown } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	export let disabled = false;
	export let asModalOnMobile = false;
	export let ariaLabel: string;
	export let testId: string | undefined = undefined;

	let button: HTMLButtonElement | undefined;
</script>

<DropdownButton
	bind:button
	on:click={modalStore.openDropdown}
	{ariaLabel}
	{testId}
	{disabled}
	opened={$modalDropdown}
>
	<slot />
</DropdownButton>

<Responsive up="1.5md">
	<Popover visible={$modalDropdown} anchor={button} invisibleBackdrop>
		<slot name="items" />
	</Popover>
</Responsive>

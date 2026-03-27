<script lang="ts">
	import { Modal, Popover } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
		visible?: boolean;
		children: Snippet;
		title?: Snippet;
		items: Snippet;
		disabled?: boolean;
		asModalOnMobile?: boolean;
		ariaLabel: string;
		buttonFullWidth?: boolean;
		buttonBorder?: boolean;
		testId?: string;
	}

	let {
		visible = $bindable(false),
		children,
		title,
		items,
		disabled = false,
		asModalOnMobile = false,
		ariaLabel,
		buttonFullWidth = false,
		buttonBorder = false,
		testId
	}: Props = $props();

	let button: HTMLButtonElement | undefined = $state();

	export const close = () => (visible = false);
</script>

<DropdownButton
	{ariaLabel}
	border={buttonBorder}
	{disabled}
	fullWidth={buttonFullWidth}
	onClick={() => (visible = true)}
	opened={visible}
	{testId}
	bind:button
>
	{@render children()}
</DropdownButton>

{#if asModalOnMobile}
	<Responsive up="1.5md">
		<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
			{@render items()}
		</Popover>
	</Responsive>

	<!-- Mobile dropdown displayed as modal -->

	<Responsive down="md">
		{#if visible}
			<Modal onClose={close} {title}>
				{@render items()}
			</Modal>
		{/if}
	</Responsive>
{:else}
	<Popover anchor={button} direction="rtl" invisibleBackdrop bind:visible>
		{@render items()}
	</Popover>
{/if}

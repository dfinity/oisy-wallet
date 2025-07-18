<script lang="ts">
	import { Modal, Popover } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import DropdownButton from '$lib/components/ui/DropdownButton.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	interface Props {
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

	let visible = $state(false);
	let button: HTMLButtonElement | undefined = $state();

	export const close = () => (visible = false);
</script>

<DropdownButton
	bind:button
	onClick={() => (visible = true)}
	{ariaLabel}
	{testId}
	{disabled}
	opened={visible}
	fullWidth={buttonFullWidth}
	border={buttonBorder}
>
	{@render children()}
</DropdownButton>

{#if asModalOnMobile}
	<Responsive up="1.5md">
		<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
			{@render items()}
		</Popover>
	</Responsive>

	<!-- Mobile dropdown displayed as modal -->

	<Responsive down="md">
		{#if visible}
			<Modal on:nnsClose={close}>
				<svelte:fragment slot="title">
					{@render title?.()}
				</svelte:fragment>

				{@render items()}
			</Modal>
		{/if}
	</Responsive>
{:else}
	<Popover bind:visible anchor={button} invisibleBackdrop direction="rtl">
		{@render items()}
	</Popover>
{/if}

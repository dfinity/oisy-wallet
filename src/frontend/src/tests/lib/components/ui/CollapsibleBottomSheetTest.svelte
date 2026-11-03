<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Button from '$lib/components/ui/Button.svelte';
	import CollapsibleBottomSheet from '$lib/components/ui/CollapsibleBottomSheet.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		withTrigger?: boolean;
		sheetTitle?: string;
		withinModal?: boolean;
		onCloseModal?: () => void;
		disabled?: boolean;
	}

	let {
		withTrigger = false,
		sheetTitle,
		withinModal = false,
		onCloseModal,
		disabled = false
	}: Props = $props();
</script>

{#snippet sheet()}
	<CollapsibleBottomSheet {disabled} {sheetTitle} trigger={withTrigger ? customTrigger : undefined}>
		{#snippet contentHeader()}
			<span>header</span>
		{/snippet}

		{#snippet content()}
			<button>Sheet action</button>
		{/snippet}
	</CollapsibleBottomSheet>
{/snippet}

{#if withinModal}
	<Modal ariaLabel="Parent dialog" onClose={onCloseModal}>{@render sheet()}</Modal>
{:else}
	{@render sheet()}
{/if}

{#snippet customTrigger({
	open,
	disabled: triggerDisabled = false
}: {
	open: () => void;
	disabled?: boolean;
})}
	{#if nonNullish(open)}
		<Button disabled={triggerDisabled} onclick={open} testId="custom-trigger">open me</Button>
	{/if}
{/snippet}

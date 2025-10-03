<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Modal } from '@dfinity/gix-components';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		title: Snippet;
		button: Snippet<[onclick: () => void]>;
		onConfirm: () => void;
		children: Snippet;
		testId?: string;
	}

	const { title: innerTitle, button, onConfirm, children, testId }: Props = $props();

	let open = $state(false);

	const onConfirmHandler = () => {
		onConfirm();
		open = false;
	};

	const onCancelHandler = () => (open = false);
</script>

{@render button(() => (open = true))}

<Modal visible={open} onClose={onCancelHandler} role="alert" {testId}>
	{#snippet title()}
		<div class="p-3">{@render innerTitle()}</div>
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<div class="my-3 flex w-full justify-between gap-3">
			<ButtonCancel onclick={onCancelHandler} testId={`${testId}-cancel`} />
			<Button onclick={onConfirmHandler} testId={`${testId}-confirm`}>Confirm</Button>
		</div>
	{/snippet}
</Modal>

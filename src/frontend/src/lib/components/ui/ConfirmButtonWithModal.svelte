<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		title?: Snippet;
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

{#snippet footer()}
	<div class="my-3 flex w-full justify-between gap-3">
		<ButtonCancel onclick={onCancelHandler} testId={`${testId}-cancel`} />
		<Button onclick={onConfirmHandler} testId={`${testId}-confirm`}
			>{$i18n.core.text.confirm}</Button
		>
	</div>
{/snippet}

{@render button(() => (open = true))}

<Responsive up="md">
	<Modal onClose={onCancelHandler} role="alert" {testId} visible={open} {footer}>
		{#snippet title()}
			<div class="p-3">{@render innerTitle?.()}</div>
		{/snippet}

		{@render children()}
	</Modal>
</Responsive>

<Responsive down="sm">
	<BottomSheet bind:visible={open} {footer}>
		{#snippet content()}
			{#if nonNullish(innerTitle)}
				<h5>{@render innerTitle?.()}</h5>
			{/if}
			{@render children()}
		{/snippet}
	</BottomSheet>
</Responsive>

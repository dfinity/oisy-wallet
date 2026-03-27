<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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
	<Modal {footer} onClose={onCancelHandler} role="alert" {testId} visible={open}>
		{#snippet title()}
			{#if nonNullish(innerTitle)}
				<div class="p-3">{@render innerTitle()}</div>
			{/if}
		{/snippet}

		{@render children()}
	</Modal>
</Responsive>

<Responsive down="sm">
	<BottomSheet {footer} bind:visible={open}>
		{#snippet content()}
			{#if nonNullish(innerTitle)}
				<h5 class="w-full py-3">{@render innerTitle()}</h5>
			{/if}
			{@render children()}
		{/snippet}
	</BottomSheet>
</Responsive>

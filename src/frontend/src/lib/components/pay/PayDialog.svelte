<script lang="ts">
	import { Html, Modal } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import BottomSheet from '$lib/components/ui/BottomSheet.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		title: Snippet;
		button: Snippet<[onclick: () => void]>;
		onConfirm: () => void;
		children: Snippet;
		testId?: string;
	}

	const { title: innerTitle, button, onConfirm, children, testId }: Props = $props();

	let open = $state(false);

	const close = () => {
		modalStore.close();

		open = false;
	};

	const modalId = Symbol();

	const openScanner = () => {
		() => modalStore.openUniversalScanner(modalId);

		close();
	};
</script>

{#snippet footer()}
	<Button onclick={openScanner}>
		{$i18n.core.text.confirm}
	</Button>
{/snippet}

<Responsive up="md">
	<Modal {footer} onClose={close}>
		{#snippet title()}
			<div class="flex items-center gap-3 font-bold text-primary">
				<Html text={replaceOisyPlaceholders(innerTitle)} />
			</div>
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

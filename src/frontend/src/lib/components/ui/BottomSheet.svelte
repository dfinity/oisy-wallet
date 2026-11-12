<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import BottomSheetContainer from '$lib/components/ui/BottomSheetContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';

	interface Props {
		visible: boolean;
		content: Snippet;
		footer?: Snippet;
		// Shown on the header row, left of the close button.
		title?: string;
		contentClass?: string;
		testId?: string;
		onClose?: () => void;
		ariaLabel?: string;
	}

	let {
		visible = $bindable(),
		content,
		footer,
		title,
		contentClass = 'min-h-[30vh]',
		ariaLabel,
		testId,
		onClose
	}: Props = $props();

	const handleClose = () => {
		visible = false;

		onClose?.();
	};

	$effect(() => {
		bottomSheetOpenStore.set(visible);

		// Reset on teardown: modal-driven sheets (e.g. PayDialog) are unmounted on
		// close rather than toggled via visible, so the effect never re-runs with
		// false — without this the store stays true and hides the mobile nav bar.
		return () => bottomSheetOpenStore.set(false);
	});
</script>

{#snippet closeButton(styleClass: string)}
	<ButtonIcon
		ariaLabel={$i18n.core.alt.close_details}
		onclick={handleClose}
		styleClass={`${styleClass} native-sheet-dismiss`}
	>
		{#snippet icon()}
			<IconClose size="24" />
		{/snippet}
	</ButtonIcon>
{/snippet}

{#if visible}
	<div class="fixed inset-0 z-14" data-tid={testId}>
		<BottomSheetContainer ariaLabel={ariaLabel ?? title} onClose={handleClose} transition>
			{#snippet header()}
				{#if nonNullish(title)}
					<div class="flex w-full items-center justify-between gap-4 p-4">
						<span class="text-lg font-bold">{title}</span>

						{@render closeButton('text-disabled')}
					</div>
				{:else}
					<div class="w-full p-4" data-native-sheet-dismiss>
						{@render closeButton('text-disabled float-right')}
					</div>
				{/if}
			{/snippet}

			<div class="w-full p-4 {contentClass}" data-sheet-content>
				{@render content()}
			</div>
			{#if nonNullish(footer)}
				<div class="overflow-hidden border-t-1 border-primary p-4">
					{@render footer()}
				</div>
			{/if}
		</BottomSheetContainer>
		<Backdrop onClose={handleClose} />
	</div>
{/if}

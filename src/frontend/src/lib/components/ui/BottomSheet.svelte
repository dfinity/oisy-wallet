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
		contentClass?: string;
		testId?: string;
		onClose?: () => void;
	}

	let {
		visible = $bindable(),
		content,
		footer,
		contentClass = 'min-h-[30vh]',
		testId,
		onClose
	}: Props = $props();

	const handleClose = () => {
		visible = false;

		onClose?.();
	};

	$effect(() => {
		bottomSheetOpenStore.set(visible);
	});
</script>

{#if visible}
	<div class="fixed inset-0 z-14" data-tid={testId}>
		<BottomSheetContainer transition>
			{#snippet header()}
				<div class="w-full p-4">
					<ButtonIcon
						ariaLabel={$i18n.core.alt.close_details}
						onclick={handleClose}
						styleClass="text-disabled float-right"
					>
						{#snippet icon()}
							<IconClose size="24" />
						{/snippet}
					</ButtonIcon>
				</div>
			{/snippet}

			<div class="w-full p-4 {contentClass}">
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

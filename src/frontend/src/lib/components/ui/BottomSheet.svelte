<script lang="ts">
	import { BottomSheet, Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { bottomSheetOpenStore } from '$lib/stores/ui.store';

	interface Props {
		visible: boolean;
		content: Snippet;
		footer?: Snippet;
		contentClass?: string;
	}

	let { visible = $bindable(), content, footer, contentClass = 'min-h-[30vh]' }: Props = $props();

	$effect(() => {
		bottomSheetOpenStore.set(visible);
	});
</script>

{#if visible}
	<div class="fixed inset-0 z-14">
		<BottomSheet transition>
			{#snippet header()}
				<div class="w-full p-4">
					<ButtonIcon
						ariaLabel={$i18n.core.alt.close_details}
						onclick={() => (visible = false)}
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
		</BottomSheet>
		<Backdrop on:nnsClose={() => (visible = false)} />
	</div>
{/if}

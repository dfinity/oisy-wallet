<script lang="ts">
	import { BottomSheet, Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		visible: boolean;
		content: Snippet;
		footer?: Snippet;
	}

	let { visible = $bindable(), content, footer }: Props = $props();

	$effect(() => {
		if (visible) {
			modalStore.openBottomSheet(Symbol('bottomsheet'));
		} else {
			modalStore.close();
		}
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

			<div class="min-h-[30vh] w-full p-4">
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

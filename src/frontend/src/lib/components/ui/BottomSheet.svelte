<script lang="ts">
	import { BottomSheet, Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		visible: boolean;
		content: Snippet;
		footer?: Snippet;
	}

	let { visible = $bindable(), content, footer }: Props = $props();
</script>

{#if visible}
	<div class="z-14 fixed inset-0">
		<BottomSheet transition on:nnsClose={() => (visible = false)}>
			<div slot="header" class="w-full p-4">
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
			<div class="min-h-[30vh] w-full p-4">
				{@render content()}
			</div>
			{#if nonNullish(footer)}
				<div class="border-t-1 overflow-hidden border-primary p-4">
					{@render footer()}
				</div>
			{/if}
		</BottomSheet>
		<Backdrop on:nnsClose={() => (visible = false)} />
	</div>
{/if}

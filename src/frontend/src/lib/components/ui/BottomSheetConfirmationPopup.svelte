<script lang="ts">
	import { Backdrop, BottomSheet } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onCancel: () => void;
		title: Snippet;
		content: Snippet;
		disabled?: boolean;
	}

	let { onCancel, title, content, disabled = false }: Props = $props();
</script>

<div class="fixed inset-0 z-50">
	<BottomSheet transition>
		<div class="flex w-full flex-col">
			<div class="w-full p-4">
				<ButtonIcon
					ariaLabel={$i18n.core.alt.close_details}
					{disabled}
					onclick={onCancel}
					styleClass="text-disabled float-right"
				>
					{#snippet icon()}
						<IconClose size="24" />
					{/snippet}
				</ButtonIcon>
			</div>

			<h3 class="mb-2 mt-4 text-center">{@render title()}</h3>

			{@render content()}
		</div>
	</BottomSheet>

	<Backdrop on:nnsClose={onCancel} />
</div>

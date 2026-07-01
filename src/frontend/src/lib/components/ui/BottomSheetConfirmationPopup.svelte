<script lang="ts">
	import { BottomSheet } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onCancel: () => void;
		title: Snippet;
		content: Snippet;
		disabled?: boolean;
		showCloseButton?: boolean;
	}

	let { onCancel, title, content, disabled = false, showCloseButton = true }: Props = $props();
</script>

<div class="fixed inset-0 z-50">
	<BottomSheet transition>
		{#snippet header()}
			<div class="flex w-full items-center justify-between gap-4 p-4">
				<h3
					class="m-0 min-w-0 break-words"
					class:text-center={!showCloseButton}
					class:w-full={!showCloseButton}
				>
					{@render title()}
				</h3>

				{#if showCloseButton}
					<ButtonIcon
						ariaLabel={$i18n.core.alt.close_details}
						{disabled}
						onclick={onCancel}
						styleClass="text-disabled"
					>
						{#snippet icon()}
							<IconClose size="24" />
						{/snippet}
					</ButtonIcon>
				{/if}
			</div>
		{/snippet}

		<div class="flex w-full flex-col">
			{@render content()}
		</div>
	</BottomSheet>

	<Backdrop onClose={onCancel} />
</div>

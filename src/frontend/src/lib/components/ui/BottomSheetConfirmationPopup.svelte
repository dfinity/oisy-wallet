<script lang="ts">
	import { BottomSheet } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onCancel: () => void;
		title: Snippet;
		content: Snippet;
		disabled?: boolean;
	}

	let { onCancel, title, content, disabled = false }: Props = $props();
</script>

{#snippet body()}
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

		<h3 class="mt-4 mb-2 text-center">{@render title()}</h3>

		{@render content()}
	</div>
{/snippet}

<!-- Mobile: a slide-up bottom sheet. gix's BottomSheet only renders as a real
     sheet below 1024px; above it collapses to a transparent, position-relative
     block, so on desktop we render the same content as a centered modal instead. -->
<Responsive down="lg">
	<div class="fixed inset-0 z-50">
		<BottomSheet transition>
			{@render body()}
		</BottomSheet>

		<Backdrop onClose={onCancel} />
	</div>
</Responsive>

<!-- Desktop: a smaller modal stacked over the underlying modal. -->
<Responsive up="1.5lg">
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<Backdrop onClose={onCancel} />

		<div
			class="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-primary shadow-[var(--overlay-box-shadow)]"
		>
			{@render body()}
		</div>
	</div>
</Responsive>

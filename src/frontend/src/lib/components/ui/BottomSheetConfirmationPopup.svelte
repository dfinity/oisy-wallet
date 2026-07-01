<script lang="ts">
	import { BottomSheet } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { CONFIRMATION_POPUP_MODAL } from '$lib/constants/test-ids.constants';

	interface Props {
		onCancel: () => void;
		title: Snippet;
		content: Snippet;
	}

	let { onCancel, title, content }: Props = $props();
</script>

{#snippet body()}
	<div class="flex w-full flex-col">
		<h3 class="px-5 pt-5 pb-2 text-xl font-bold">{@render title()}</h3>

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
			aria-modal="true"
			data-tid={CONFIRMATION_POPUP_MODAL}
			role="dialog"
		>
			{@render body()}
		</div>
	</div>
</Responsive>

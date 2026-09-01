<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import BottomSheetContainer from '$lib/components/ui/BottomSheetContainer.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { CONFIRMATION_POPUP_MODAL } from '$lib/constants/test-ids.constants';
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

{#snippet body()}
	<div class="flex w-full flex-col">
		<div class="flex w-full items-center justify-between gap-4 px-5 pt-5 pb-2">
			<h3 class="m-0 min-w-0 break-words text-xl font-bold" class:w-full={!showCloseButton}>
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

		{@render content()}
	</div>
{/snippet}

<!-- Mobile: a slide-up bottom sheet. The bottom sheet only renders as a real
     sheet below 1024px; above it collapses to a transparent, position-relative
     block, so on desktop we render the same content as a centered modal instead. -->
<Responsive down="lg">
	<div class="fixed inset-0 z-50">
		<BottomSheetContainer transition>
			{@render body()}
		</BottomSheetContainer>

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

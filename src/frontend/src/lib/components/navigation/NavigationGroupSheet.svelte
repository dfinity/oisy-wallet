<script lang="ts">
	import { BottomSheet } from '@dfinity/gix-components';
	import type { Snippet } from 'svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';

	interface Props {
		visible: boolean;
		label: string;
		onClose: () => void;
		testId?: string;
		children: Snippet;
	}

	let { visible, label, onClose, testId, children }: Props = $props();
</script>

<!--
	A navigation group's bottom sheet. Unlike the shared `BottomSheet`, this does
	NOT set `bottomSheetOpenStore`, so the bottom bar stays visible underneath and
	its cradle/More entry can show the grey/blue "open" state. Sits below the bar
	(z-11 vs the bar's z-12) so the bar/cradle remain on top and tappable.
-->
{#if visible}
	<div class="fixed inset-0 z-11" data-tid={testId}>
		<Backdrop {onClose} />
		<BottomSheet transition>
			<div class="flex w-full flex-col gap-1 px-4 pt-4 pb-24">
				<h2 class="px-3 pb-2 text-sm font-bold text-tertiary">{label}</h2>
				{@render children()}
			</div>
		</BottomSheet>
	</div>
{/if}

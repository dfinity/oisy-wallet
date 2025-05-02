<script lang="ts">
	import { Collapsible, Backdrop } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import GixBottomSheet from '$lib/components/ui/GixBottomSheet.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	let {
		content,
		contentHeader,
		bottomSheetFooter
	}: {
		content: Snippet;
		contentHeader: Snippet;
		bottomSheetFooter?: Snippet<[closeFn: () => void]>;
	} = $props();

	let expanded = $state(false);

	$effect(() => {
		document.body.classList.toggle('overflow-hidden', expanded);
	});
</script>

<Responsive down="md">
	{#if expanded}
		<div class="z-14 fixed bottom-0 left-0 right-0 top-0">
			<GixBottomSheet on:nnsClose={() => (expanded = false)} transition>
				<div slot="header" class="w-full p-4">
					<ButtonIcon
						on:click={() => (expanded = false)}
						styleClass="text-disabled float-right"
						ariaLabel="close"
					>
						<IconClose slot="icon" size="24" />
					</ButtonIcon>
				</div>
				<div class="min-h-[35vh] w-full pb-4 pl-4 pr-4">
					{@render content()}
				</div>
				<div slot="footer" class="w-full p-4">
					{#if nonNullish(bottomSheetFooter)}
						{@render bottomSheetFooter(() => {
							expanded = false;
						})}
					{/if}
				</div>
			</GixBottomSheet>
			<Backdrop on:nnsClose={() => (expanded = false)} />
		</div>
	{/if}
</Responsive>

<Collapsible bind:expanded initiallyExpanded={expanded}>
	<!-- The width of the item below should be 100% - collapsible expand button width (1.5rem) -->
	<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
		{@render contentHeader()}
	</div>

	<Responsive up="1.5md">
		{@render content()}
	</Responsive>
</Collapsible>

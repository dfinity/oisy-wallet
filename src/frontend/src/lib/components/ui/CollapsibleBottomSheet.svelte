<script lang="ts">
	import { Collapsible, Backdrop, BottomSheet } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	let {
		content,
		contentHeader,
		contentFooter
	}: {
		content: Snippet;
		contentHeader: Snippet;
		contentFooter?: Snippet<[closeFn: () => void]>;
	} = $props();

	let expanded = $state(false);
</script>

<!-- 🔽 MOBILE (BottomSheet) -->
<Responsive down="sm">
	<!-- Хедер + іконка -->
	<div class="flex w-full items-center justify-between">
		{@render contentHeader()}
		<ButtonIcon on:click={() => (expanded = true)} styleClass="text-primary" ariaLabel="expand">
			<span>fds</span>
		</ButtonIcon>
	</div>

	<!-- BottomSheet, якщо expanded -->
	{#if expanded}
		<div class="z-14 fixed inset-0">
			<BottomSheet on:nnsClose={() => (expanded = false)} transition>
				<!-- Header -->
				<div slot="header" class="w-full">
					<ButtonIcon
						on:click={() => (expanded = false)}
						styleClass="text-disabled float-right"
						ariaLabel="close"
					>
						<IconClose slot="icon" size="24" />
					</ButtonIcon>
				</div>

				<!-- Content -->
				<div class="min-h-[35vh] w-full px-4 pb-4">
					{@render content()}
				</div>
				<div slot="footer" class="w-full p-4">
					{#if nonNullish(contentFooter)}
						{@render contentFooter(() => {
							expanded = false;
						})}
					{/if}
				</div>
			</BottomSheet>
			<Backdrop on:nnsClose={() => (expanded = false)} />
		</div>
	{/if}
</Responsive>

<!-- 💻 DESKTOP (Collapsible) -->
<Responsive up="md">
	<Collapsible bind:expanded initiallyExpanded={expanded} externalToggle expandButton={false}>
		<!-- Хедер -->
		<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
			{@render contentHeader()}
		</div>

		<!-- Контент -->
		{@render content()}
	</Collapsible>
</Responsive>

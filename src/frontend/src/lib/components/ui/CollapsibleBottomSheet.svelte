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
		contentHeader?: Snippet;
		contentFooter?: Snippet<[closeFn: () => void]>;
	} = $props();

	let expanded = $state(false);
</script>

<Responsive down="sm">
	{#if expanded}
		<div class="z-14 fixed inset-0">
			<BottomSheet on:nnsClose={close} transition>
				<div slot="header" class="flex w-full items-center justify-between p-4">
					{#if nonNullish(contentHeader)}
						{@render contentHeader()}
					{/if}
					<ButtonIcon on:click={close} styleClass="text-disabled" ariaLabel="close">
						<IconClose slot="icon" size="24" />
					</ButtonIcon>
				</div>
				<div class="min-h-[35vh] w-full pb-4 pl-4 pr-4">
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

			<Backdrop on:nnsClose={close} />
		</div>
	{/if}
</Responsive>

<Collapsible bind:expanded initiallyExpanded={expanded}>
	<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
		{#if nonNullish(contentHeader)}
			{@render contentHeader()}
		{/if}
	</div>

	<Responsive up="md">
		{@render content()}
	</Responsive>
</Collapsible>

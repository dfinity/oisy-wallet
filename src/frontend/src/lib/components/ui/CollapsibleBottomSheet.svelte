<script lang="ts">
	import { Collapsible, Backdrop, BottomSheet } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import Button from './Button.svelte';

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

<Responsive down="sm">
	<div class="flex w-full items-center justify-between">
		{@render contentHeader()}
		<Button on:click={() => (expanded = true)} styleClass="text-primary" ariaLabel="expand">
			I
		</Button>
	</div>

	{#if expanded}
		<div class="z-14 fixed inset-0">
			<BottomSheet on:nnsClose={() => (expanded = false)} transition>
				<div slot="header" class="w-full">
					<ButtonIcon
						on:click={() => (expanded = false)}
						styleClass="text-disabled float-right"
						ariaLabel="close"
					>
						<IconClose slot="icon" size="24" />
					</ButtonIcon>
				</div>

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

<Responsive up="sm">
	<Collapsible bind:expanded initiallyExpanded={expanded}>
		<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
			{@render contentHeader()}
		</div>

		{@render content()}
	</Collapsible>
</Responsive>

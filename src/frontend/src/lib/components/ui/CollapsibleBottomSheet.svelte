<script lang="ts">
	import { Collapsible, Backdrop, BottomSheet } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import Button from './Button.svelte';
	import IconInfo from '../icons/lucide/IconInfo.svelte';

	let {
		content,
		contentHeader,
		contentFooter,
		showContentHeader = false
	}: {
		content: Snippet;
		contentHeader: Snippet;
		contentFooter?: Snippet<[closeFn: () => void]>;
		showContentHeader?: boolean;
	} = $props();

	let expanded = $state(false);
</script>

<Responsive down="sm">
	<div class="flex w-full justify-between">
		{@render contentHeader()}
		<ButtonIcon
			on:click={() => (expanded = true)}
			ariaLabel="expand"
			colorStyle="muted"
			styleClass="mb-2"
		>
			<IconInfo slot="icon" />
		</ButtonIcon>
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
					{#if showContentHeader}
						{@render contentHeader()}
					{/if}
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

<Responsive up="md">
	<Collapsible bind:expanded initiallyExpanded={expanded}>
		<div class="flex w-[calc(100%-2rem)] items-center" slot="header">
			{@render contentHeader()}
		</div>

		{@render content()}
	</Collapsible>
</Responsive>

<style lang="scss">
	:global(.modal-expandable-values > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>

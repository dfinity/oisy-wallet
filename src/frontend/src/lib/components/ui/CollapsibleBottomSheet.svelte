<script lang="ts">
	import { Collapsible, Backdrop, BottomSheet } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let {
		content,
		contentHeader,
		contentFooter,
		showContentHeader = false
	}: {
		content: Snippet;
		contentHeader: Snippet<[{ isInBottomSheet: boolean }]>;
		contentFooter?: Snippet<[closeFn: () => void]>;
		showContentHeader?: boolean;
	} = $props();

	let expanded = $state(false);
</script>

<Responsive down="sm">
	<div class="flex w-full items-center justify-between">
		{@render contentHeader({ isInBottomSheet: false })}
		<ButtonIcon
			ariaLabel={$i18n.core.alt.open_details}
			colorStyle="muted"
			onclick={() => (expanded = true)}
			styleClass="text-disabled mb-2 items-end"
			width="w-8"
		>
			{#snippet icon()}
				<IconInfo />
			{/snippet}
		</ButtonIcon>
	</div>

	{#if expanded}
		<div class="z-14 fixed inset-0">
			<BottomSheet on:nnsClose={() => (expanded = false)} transition>
				{#snippet header()}
					<div class="w-full p-4">
						<ButtonIcon
							onclick={() => (expanded = false)}
							styleClass="text-disabled float-right"
							ariaLabel={$i18n.core.alt.close_details}
						>
							{#snippet icon()}
								<IconClose size="24" />
							{/snippet}
						</ButtonIcon>
					</div>
				{/snippet}

				<div class="min-h-[35vh] w-full px-4 pb-4">
					{#if showContentHeader}
						{@render contentHeader({ isInBottomSheet: true })}
					{/if}
					{@render content()}
				</div>
				{#snippet footer()}
					<div class="w-full p-4">
						{#if nonNullish(contentFooter)}
							{@render contentFooter(() => {
								expanded = false;
							})}
						{/if}
					</div>
				{/snippet}
			</BottomSheet>
			<Backdrop on:nnsClose={() => (expanded = false)} />
		</div>
	{/if}
</Responsive>

<Responsive up="md">
	<div class="modal-expandable-values">
		<Collapsible initiallyExpanded={expanded} bind:expanded>
			{#snippet header()}
				<div class="flex w-[calc(100%-1.5rem)] items-center">
					{@render contentHeader({ isInBottomSheet: false })}
				</div>
			{/snippet}

			{@render content()}
		</Collapsible>
	</div>
</Responsive>

<style lang="scss">
	:global(.modal-expandable-values > div.contents > div.header > button.collapsible-expand-icon) {
		justify-content: flex-end;
	}
</style>

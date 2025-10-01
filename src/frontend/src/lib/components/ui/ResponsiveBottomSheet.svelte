<script lang="ts">
	import { Backdrop, BottomSheet } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';

	let {
		content,
		contentFooter,
		onClose
	}: {
		content: Snippet;
		contentFooter?: Snippet;
		onClose: () => void;
	} = $props();
</script>

<Responsive down="sm">
	<div class="z-14 fixed bottom-0 left-0 right-0 top-0">
		<BottomSheet on:nnsClose={() => onClose()} transition>
			<div slot="header" class="w-full p-4">
				<ButtonIcon
					on:click={() => onClose()}
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
				{#if nonNullish(contentFooter)}
					{@render contentFooter()}
				{/if}
			</div>
		</BottomSheet>
		<div class="fixed bottom-0 left-0 right-0 top-0">
			<Backdrop on:nnsClose={() => onClose()} />
		</div>
	</div>
</Responsive>

<Responsive up="md">
	{@render content()}
</Responsive>

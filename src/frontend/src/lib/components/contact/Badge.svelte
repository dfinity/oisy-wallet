<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		showBorder: boolean;
		children: Snippet;
		content?: Snippet;
	}

	let { showBorder = true, children, content }: Props = $props();
</script>

{#if nonNullish(content)}
	<div class="relative">
		{@render children()}
		<span class="md:size-5.5 absolute -bottom-1 -right-1 size-5 rounded-full bg-primary">
			{#if showBorder}
				<div
					class="border-1 flex size-full items-center justify-center rounded-full border-secondary text-xs font-bold"
					>{@render content()}</div
				>
			{:else}
				{@render content()}
			{/if}
		</span>
	</div>
{:else}
	{@render children()}
{/if}

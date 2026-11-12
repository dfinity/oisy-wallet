<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		outerContent?: Snippet;
		toolbar?: Snippet;
		showToolbar?: boolean;
		styleClass?: string;
		testId?: string;
	}

	let { children, outerContent, toolbar, showToolbar = true, styleClass, testId }: Props = $props();
</script>

<div class={`stretch ${styleClass ?? ''}`} data-tid={testId}>
	{@render children?.()}
</div>

{@render outerContent?.()}

{#if toolbar && showToolbar}
	<div
		class="sticky bottom-0 left-0 w-full border-t border-secondary bg-surface px-3 pt-4 pb-4 md:px-6 md:pt-5 md:pb-6"
		data-modal-toolbar
	>
		{@render toolbar()}
	</div>
{/if}

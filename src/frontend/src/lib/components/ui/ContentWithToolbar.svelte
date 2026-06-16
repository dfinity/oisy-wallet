<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		outerContent?: Snippet;
		toolbar?: Snippet;
		styleClass?: string;
		testId?: string;
	}

	let { children, outerContent, toolbar, styleClass, testId }: Props = $props();
</script>

<div class={`stretch ${styleClass ?? ''}`} data-tid={testId}>
	{@render children?.()}
</div>

{@render outerContent?.()}

<div
	class="border-secondary bg-surface sticky bottom-0 left-0 w-full border-t px-3 pt-4 pb-4 md:px-6 md:pt-5 md:pb-6"
>
	{@render toolbar?.()}
</div>

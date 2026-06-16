<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';

	interface Props {
		children: Snippet;
		styleClass?: string;
		testId?: string;
	}

	let { children, styleClass, testId }: Props = $props();
</script>

<div
	class={`border-warning-solid bg-warning-subtle-10 text-warning-primary inline-flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs font-bold sm:w-fit md:px-6 md:py-2 md:text-base ${styleClass ?? ''}`}
	data-tid={testId}
>
	<IconWarning inline></IconWarning>

	{@render children()}
</div>

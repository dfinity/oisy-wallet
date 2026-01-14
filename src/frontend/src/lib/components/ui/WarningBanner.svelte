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
	class={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-warning-solid bg-warning-subtle-10 p-2 text-xs font-bold text-warning-primary sm:w-fit md:px-6 md:py-2 md:text-base ${styleClass ?? ''}`}
	data-tid={testId}
>
	<IconWarning inline></IconWarning>

	{@render children()}
</div>

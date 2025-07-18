<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';

	interface Props {
		children: Snippet;
		styleClass?: string;
	}
	let { children, styleClass }: Props = $props();
</script>

<div
	class={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-warning-solid bg-warning-subtle-10 px-6 py-2 text-xs font-bold text-warning-primary sm:w-fit md:text-base ${styleClass ?? ''}`}
>
	<IconWarning inline></IconWarning>

	{@render children()}
</div>

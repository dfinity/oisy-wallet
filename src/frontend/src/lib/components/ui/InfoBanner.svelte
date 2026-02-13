<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';

	interface Props {
		children: Snippet;
		testId?: string;
	}

	let { children, testId }: Props = $props();
</script>

<div
	class="border-info-solid bg-info-subtle-10 text-info-primary inline-flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-xs sm:w-fit md:px-6 md:py-2 md:text-base"
	data-tid={testId}
>
	<IconInfo />

	{@render children()}
</div>

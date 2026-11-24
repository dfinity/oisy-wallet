<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		children: Snippet;
	}

	let { label, children }: Props = $props();
</script>

<!-- Outer radius = inner radius (20px) + padding (12px / 20px), so the corners stay concentric. -->
<div class="rounded-[32px] bg-brand-subtle-10 p-3 sm:rounded-[40px] sm:p-5">
	<div
		class="overflow-hidden rounded-[20px] bg-primary shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
		aria-label={label}
		role="img"
	>
		<!-- inert: the previews reuse real app controls, which must not take focus or clicks here. -->
		<div class="pointer-events-none select-none" aria-hidden="true" inert>
			{@render children()}
		</div>
	</div>
</div>

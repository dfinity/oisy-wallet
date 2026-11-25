<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		interactive?: boolean;
		children: Snippet;
	}

	let { label, interactive = false, children }: Props = $props();
</script>

<!--
	Outer radius = inner radius (28px) + padding (12px / 20px), so the corners stay concentric. The
	inner 28px is itself a 16px corner radius sitting 12px in, the previews' mobile padding.
-->
<div class="rounded-[40px] bg-brand-subtle-10 p-3 sm:rounded-[48px] sm:p-5">
	<div
		class="overflow-hidden rounded-[28px] bg-primary shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
		aria-label={label}
		role={interactive ? 'group' : 'img'}
	>
		<!-- Decorative previews reuse real app controls without taking focus or clicks. -->
		<div
			class:pointer-events-none={!interactive}
			class:select-none={!interactive}
			aria-hidden={interactive ? undefined : true}
			inert={!interactive}
		>
			{@render children()}
		</div>
	</div>
</div>

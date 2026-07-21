<script lang="ts">
	import type { Snippet } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { liquidiumHealthLevel } from '$lib/utils/liquidium.utils';

	interface Props {
		percent: number;
		label?: string;
		showBar?: boolean;
		badge?: Snippet;
	}

	let { percent, label, showBar = true, badge }: Props = $props();

	let level = $derived(liquidiumHealthLevel(percent));

	let markerLeft = $derived(Math.min(100, Math.max(0, percent)));
</script>

<div class="flex w-full flex-col gap-2">
	<div class="flex items-center justify-between text-sm">
		<span class="flex items-center gap-2">
			<span class="text-tertiary">{label ?? $i18n.liquidium.text.projected_health_factor}</span>
			{@render badge?.()}
		</span>
		<span
			class="font-bold"
			class:text-error-primary={level === 'critical'}
			class:text-success-primary={level === 'healthy'}
			class:text-warning-primary={level === 'at-risk'}
		>
			{Math.round(percent)}%
		</span>
	</div>

	{#if showBar}
		<div
			style="background: linear-gradient(90deg, var(--color-background-error-primary), var(--color-background-warning-primary) 45%, var(--color-background-success-primary));"
			class="relative h-2 rounded-md"
		>
			<div
				style={`left: ${markerLeft}%;`}
				class="absolute -top-0.5 h-3 w-1 rounded-sm bg-primary-inverted transition-all"
			></div>
		</div>
	{/if}
</div>

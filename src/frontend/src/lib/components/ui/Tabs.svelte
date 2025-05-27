<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		tabs: NonEmptyArray<{ label: string; id: string }>;
		activeTab: string;
		children: Snippet;
		styleClass?: string;
	}

	let { children, activeTab = $bindable(), tabs, styleClass }: Props = $props();
</script>

<div class={`flex ${styleClass ?? ''}`}>
	{#each tabs as { label, id }, index (id)}
		<button
			onclick={() => (activeTab = id)}
			aria-label={label}
			class="w-full justify-center rounded-none border-0 border-b-2 p-2 text-sm font-semibold transition hover:border-brand-primary hover:text-brand-primary sm:text-base"
			class:ml-4={index !== 0}
			class:text-tertiary-inverted={activeTab !== id}
			class:border-primary={activeTab !== id}
			class:text-brand-primary={activeTab === id}
			class:border-brand-primary={activeTab === id}
		>
			{label}
		</button>
	{/each}
</div>

<div class="mt-6">
	{@render children()}
</div>

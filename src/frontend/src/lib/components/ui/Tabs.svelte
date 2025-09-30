<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import type { TabVariant } from '$lib/types/style';
	import type { NonEmptyArray } from '$lib/types/utils';

	interface Props {
		tabs: NonEmptyArray<{ label: string; id: string; path?: string }>;
		activeTab: string;
		children?: Snippet;
		styleClass?: string;
		tabVariant?: TabVariant;
	}

	let {
		children,
		activeTab = $bindable(),
		tabs,
		styleClass,
		tabVariant = 'default'
	}: Props = $props();

	const handleClick = ({ id, path }: { id: string; path?: string }): void => {
		if (isNullish(path)) {
			activeTab = id;
		} else {
			goto(path);
		}
	};
</script>

<div class={`flex items-center ${styleClass ?? ''}`}>
	{#each tabs as { label, id, path }, index (id)}
		<button
			class="justify-center rounded-none border-0 text-sm font-semibold transition hover:border-brand-primary sm:text-base"
			class:border-b-2={activeTab === id || tabVariant === 'default'}
			class:border-brand-primary={activeTab === id}
			class:border-primary={activeTab !== id}
			class:h-6={tabVariant === 'menu'}
			class:hover:text-brand-primary={tabVariant === 'default'}
			class:hover:text-primary={tabVariant === 'menu'}
			class:ml-4={index !== 0}
			class:p-2={tabVariant === 'default'}
			class:text-brand-primary={activeTab === id && tabVariant === 'default'}
			class:text-tertiary={activeTab !== id && tabVariant === 'menu'}
			class:text-tertiary-inverted={activeTab !== id && tabVariant === 'default'}
			class:w-full={tabVariant === 'default'}
			aria-label={label}
			onclick={() => handleClick({ id, path })}
		>
			{label}
		</button>
	{/each}
</div>

<div class="mt-6">
	{@render children?.()}
</div>

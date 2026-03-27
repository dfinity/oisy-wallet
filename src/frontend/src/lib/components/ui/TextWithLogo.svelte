<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		logo?: 'start' | 'end';
		description?: string;
		icon: Snippet;
	}

	let { name, logo = 'end', description, icon }: Props = $props();
</script>

<span
	class="flex"
	class:flex-row-reverse={logo === 'start'}
	class:gap-1={logo === 'end'}
	class:gap-2={logo === 'start'}
	class:items-center={!description}
>
	<span class="flex flex-col gap-0.5">
		<span class="leading-5">{name}</span>
		{#if nonNullish(description)}
			<span class="text-left text-xs leading-none text-tertiary">{description}</span>
		{/if}
	</span>
	{@render icon()}
</span>

<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';

	export let src: string | undefined;
	export let alt = '';
	export let size: string;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';

	let loaded = isNullish(src);
</script>

<div
	class="flex items-center justify-center rounded-full"
	class:bg-dust={color === 'dust'}
	class:bg-off-white={color === 'off-white'}
	class:bg-white={color === 'white'}
	class:opacity-10={!loaded}
	style={`border: 1px solid var(--color-${
		color === 'off-white' ? 'off-white' : 'dust'
	}); width: calc(${size} + 2px); height: calc(${size} + 2px); transition: opacity 0.15s ease-in;`}
>
	{#if nonNullish(src)}
		<Img {src} {alt} width={size} height={size} on:load={() => (loaded = true)} />
	{:else}
		<IconRandom {size} text={alt} />
	{/if}
</div>

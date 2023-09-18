<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	export let src: string;
	export let alt = '';
	export let width: string;
	export let height: string;
	export let color: 'dust' | 'off-white' = 'dust';

	let loaded = false;
</script>

<div
	class="flex items-center justify-center rounded-50"
	class:bg-dust={color === 'dust'}
	class:bg-off-white={color === 'off-white'}
	class:opacity-15={!loaded}
	style={`border: 1px solid var(--color-${color}); width: calc(${width} + 2px); height: calc(${height} + 2px); transition: opacity 0.15s ease-in;`}
>
	<Img {src} {alt} {width} {height} on:load={() => (loaded = true)} />
</div>

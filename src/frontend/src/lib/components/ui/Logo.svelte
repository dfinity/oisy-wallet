<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';

	export let src: string | undefined;
	export let alt = '';
	export let size: 'small' | 'medium' | 'big' = 'small';
	export let color: 'dust' | 'off-white' | 'white' = 'dust';

	const sizes = {
		small: '20px',
		medium: '52px',
		big: '64px'
	};
	let sizePx = sizes[size];

	let loaded = false;

	$: src,
		(() => {
			loaded = isNullish(src);
			loadingError = false;
		})();

	let loadingError = false;
	const onError = () => {
		loadingError = true;
		loaded = true;
	};
</script>

<div
	class="flex items-center justify-center rounded-full overflow-hidden"
	class:bg-dust={color === 'dust'}
	class:bg-off-white={color === 'off-white'}
	class:bg-white={color === 'white'}
	class:opacity-10={!loaded}
	style={`border: 1px solid var(--color-${
		color === 'off-white' ? 'off-white' : 'dust'
	}); width: calc(${sizePx} + 2px); height: calc(${sizePx} + 2px); transition: opacity 0.15s ease-in;`}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{src}
			{alt}
			width={sizePx}
			height={sizePx}
			on:load={() => (loaded = true)}
			on:error={onError}
			rounded
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

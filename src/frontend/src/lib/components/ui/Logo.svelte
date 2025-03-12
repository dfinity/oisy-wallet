<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import type { LogoSize } from '$lib/types/components';

	export let src: string | undefined;
	export let alt = '';
	export let size: LogoSize = 'xxs';
	export let color: 'off-white' | 'white' = 'off-white';
	export let ring = false;
	export let testId: string | undefined = undefined;

	let sizePx = logoSizes[size];

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
	class="flex items-center justify-center overflow-hidden rounded-full ring-primary"
	class:bg-off-white={color === 'off-white' && !loaded}
	class:bg-white={color === 'white' && !loaded}
	class:opacity-10={!loaded}
	class:ring-2={ring}
	style={`width: ${sizePx}; height: ${sizePx}; transition: opacity 0.15s ease-in;`}
	data-tid={testId}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{src}
			{alt}
			fitHeight
			height={sizePx}
			on:load={() => (loaded = true)}
			on:error={onError}
			rounded
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

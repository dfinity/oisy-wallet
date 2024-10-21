<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { LogoSize } from '$lib/types/logo-size';

	export let src: string | undefined;
	export let alt = '';
	export let size: LogoSize = LogoSize.XS;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let ring = false;
	export let styleClass: string | undefined = undefined;

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
	class="flex items-center justify-center overflow-hidden rounded-full ring-white {styleClass}"
	class:bg-dust={color === 'dust' && !loaded}
	class:bg-off-white={color === 'off-white' && !loaded}
	class:bg-white={color === 'white' && !loaded}
	class:opacity-10={!loaded}
	class:ring-1={ring}
	style={`width: ${size}; height: ${size}; transition: opacity 0.15s ease-in;`}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{src}
			{alt}
			fitHeight
			height={size}
			on:load={() => (loaded = true)}
			on:error={onError}
			rounded
		/>
	{:else}
		<IconRandom {size} text={alt} />
	{/if}
</div>

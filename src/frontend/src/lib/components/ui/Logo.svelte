<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';

	export let src: string | undefined;
	export let alt = '';
	export let size: string;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let cornerLogoSrc: string | undefined = undefined;
	export let cornerLogoAlt = '';

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
	class="relative flex items-center justify-center rounded-full"
	class:bg-dust={color === 'dust'}
	class:bg-off-white={color === 'off-white'}
	class:bg-white={color === 'white'}
	class:opacity-10={!loaded}
	style={`border: 1px solid var(--color-${
		color === 'off-white' ? 'off-white' : 'dust'
	}); width: calc(${size} + 2px); height: calc(${size} + 2px); transition: opacity 0.15s ease-in;`}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{src}
			{alt}
			width={size}
			height={size}
			on:load={() => (loaded = true)}
			on:error={onError}
			rounded
		/>
	{:else}
		<IconRandom {size} text={alt} />
	{/if}
	{#if nonNullish(cornerLogoSrc)}
		<div class="absolute bottom-0 right-0">
			<Logo
				src={cornerLogoSrc}
				alt={cornerLogoAlt}
				size={`calc(${size} * 20 / 52)`}
				color="white"
			/>
		</div>
	{/if}
</div>

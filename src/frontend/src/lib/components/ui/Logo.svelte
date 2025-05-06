<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import type { LogoSize } from '$lib/types/components';

	interface Props {
		src?: string;
		alt?: string;
		size?: LogoSize;
		color?: 'off-white' | 'white';
		ring?: boolean;
		testId?: string;
	}

	let { src, alt = '', size = 'xxs', color = 'off-white', ring = false, testId }: Props = $props();

	let sizePx = $state(logoSizes[size]);

	let loadingError: boolean | undefined = $state();
	let loaded = $derived(nonNullish(src) && nonNullish(loadingError) && !loadingError);
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
			on:load={() => (loadingError = false)}
			on:error={() => (loadingError = true)}
			rounded
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

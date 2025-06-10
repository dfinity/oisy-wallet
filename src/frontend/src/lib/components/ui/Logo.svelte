<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
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
	let isReady = $derived((nonNullish(src) && nonNullish(loadingError)) || isNullish(src));
</script>

<div
	class="flex items-center justify-center overflow-hidden rounded-full ring-primary"
	class:bg-off-white={color === 'off-white' && !isReady}
	class:bg-white={color === 'white' && !isReady}
	class:opacity-10={!isReady}
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
			onLoad={() => (loadingError = false)}
			onError={() => (loadingError = true)}
			rounded
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

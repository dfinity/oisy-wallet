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
		color?: 'off-white' | 'white' | 'transparent';
		ring?: boolean;
		circle?: boolean;
		testId?: string;
	}

	let {
		src,
		alt = '',
		size = 'xxs',
		color = 'off-white',
		ring = false,
		circle = true,
		testId
	}: Props = $props();

	let sizePx = $state(logoSizes[size]);

	let loadingError: boolean | undefined = $state();
	let isReady = $derived((nonNullish(src) && nonNullish(loadingError)) || isNullish(src));
</script>

<div
	style={`width: ${sizePx}; height: ${sizePx}; transition: opacity 0.15s ease-in;`}
	class="flex items-center justify-center overflow-hidden ring-primary"
	class:bg-off-white={color === 'off-white' && !isReady}
	class:bg-white={color === 'white' && !isReady}
	class:opacity-10={!isReady}
	class:ring-2={ring}
	class:rounded-full={circle}
	class:rounded-lg={!circle}
	data-tid={testId}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{alt}
			fitHeight
			height={sizePx}
			onError={() => (loadingError = true)}
			onLoad={() => (loadingError = false)}
			{src}
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

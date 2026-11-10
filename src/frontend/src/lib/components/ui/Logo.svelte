<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import IconRandom from '$lib/components/icons/IconRandom.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { logoSizes } from '$lib/constants/components.constants';
	import type { LogoSize } from '$lib/types/components';
	import { isIOS } from '$lib/utils/device.utils';

	interface Props {
		src?: string;
		loading?: 'eager' | 'lazy';
		alt?: string;
		size?: LogoSize;
		color?: 'off-white' | 'white';
		ring?: boolean;
		circle?: boolean;
		animateReadiness?: boolean;
		testId?: string;
	}

	let {
		src,
		loading = 'lazy',
		alt = '',
		size = 'xxs',
		color = 'off-white',
		ring = false,
		circle = true,
		animateReadiness = true,
		testId
	}: Props = $props();

	let sizePx = $derived(logoSizes[size]);

	let loadingError: boolean | undefined = $state();
	let isReady = $derived((nonNullish(src) && nonNullish(loadingError)) || isNullish(src));

	let ios = $derived(isIOS());
</script>

<div
	style={`width: ${sizePx}; height: ${sizePx};`}
	class="flex items-center justify-center overflow-hidden ring-primary"
	class:bg-off-white={color === 'off-white' && !isReady}
	class:bg-white={color === 'white' && !isReady}
	class:ease-in={animateReadiness && !ios}
	class:opacity-10={animateReadiness && !isReady}
	class:ring-2={ring}
	class:rounded-full={circle}
	class:rounded-lg={!circle}
	class:transition-opacity={animateReadiness && !ios}
	data-tid={testId}
>
	{#if nonNullish(src) && !loadingError}
		<Img
			{alt}
			fitHeight
			height={sizePx}
			{loading}
			onError={() => (loadingError = true)}
			onLoad={() => (loadingError = false)}
			{src}
		/>
	{:else}
		<IconRandom size={sizePx} text={alt} />
	{/if}
</div>

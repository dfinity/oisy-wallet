<script lang="ts">
	/**
	 * Inspired by:
	 *
	 * - Shoelace: https://github.com/shoelace-style/shoelace/blob/next/src/components/qr-code/qr-code.ts
	 * - DeckDeckGo: https://github.com/deckgo/deckdeckgo/blob/main/webcomponents/elements/src/components/qrcode/qrcode/qrcode.tsx
	 */
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import { TEST } from '$lib/constants/app.constants';
	import type { QrCreatorClass } from '$lib/types/qr-creator';

	interface Props {
		ariaLabel?: string;
		value: string;
		// Valid CSS colors
		fillColor?: string;
		backgroundColor?: string;
		// The edge radius of each module. Must be between 0 and 0.5.
		radius?: number;
		// https://www.qrcode.com/en/about/error_correction.html
		ecLevel?: 'L' | 'M' | 'Q' | 'H';
		onQRCodeRendered?: () => void;
		logo?: Snippet;
	}

	let {
		ariaLabel,
		value,
		fillColor = 'black',
		backgroundColor = 'white',
		radius = 0,
		ecLevel = 'H',
		onQRCodeRendered,
		logo
	}: Props = $props();

	let label = $derived(nonNullish(ariaLabel) && ariaLabel.length > 0 ? ariaLabel : value);

	let container: HTMLDivElement | undefined;
	let size = $state<{ width: number } | undefined>();

	// Add a small debounce in case the screen is resized
	const initSize = debounce(() => {
		if (isNullish(container)) {
			size = undefined;
			return;
		}

		const { width } = container.getBoundingClientRect();
		size = {
			width
		};
	}, 25);

	const isBrowser = typeof window !== 'undefined';

	let QrCreator = $state<QrCreatorClass>();
	onMount(async () => {
		// The qr-creator library is not compatible with NodeJS environment
		if (!isBrowser) {
			return;
		}

		// The library leads to issues (es modules import error, segmentation fault, blocking tests etc.) in tests.
		// Therefore, the simplest way to avoid these problems is to skip it globally in tests.
		// It remains tested in e2e tests.
		if (TEST) {
			return;
		}

		QrCreator = (await import('qr-creator')).default;
	});

	let once = false;

	$effect(() => {
		if (once) {
			return;
		}

		initSize();
		once = true;
	});

	const renderCanvas = () => {
		if (isNullish(canvas) || isNullish(size)) {
			return;
		}

		QrCreator?.render(
			{
				text: value,
				radius,
				ecLevel,
				fill: fillColor,
				background: backgroundColor,
				// We draw the canvas larger and scale its container down to avoid blurring on high-density displays
				size: size.width * 2
			},
			canvas
		);

		onQRCodeRendered?.();
	};

	let canvas = $state<HTMLCanvasElement | undefined>();

	$effect(() => {
		[QrCreator, value, canvas];

		(() => renderCanvas())();
	});

	let showLogo = $derived(nonNullish(logo));
</script>

<svelte:window onresize={initSize} />

<div bind:this={container} class="container" data-tid="qr-code">
	{#if nonNullish(size)}
		<canvas
			bind:this={canvas}
			style={`width: ${size.width > 0 ? `${size.width}px` : '100%'}; height: ${
				size.width > 0 ? `${size.width}px` : '100%'
			}`}
			aria-label={label}
		></canvas>
	{/if}

	{#if showLogo}
		<div class="logo">
			{@render logo?.()}
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		position: relative;
	}

	.logo {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>

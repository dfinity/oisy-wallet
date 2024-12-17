<script lang="ts">
	import { Confetti } from 'svelte-confetti';
	import snow1 from '$lib/assets/snow-1.svg';
	import snow2 from '$lib/assets/snow-2.svg';
	import snow3 from '$lib/assets/snow-3.svg';

	// svelte-confetti passes the colorArray to the CSS background property. That's why, it can be used for images with CSS url().
	// See: https://github.com/Mitcheljager/svelte-confetti/blob/1fa67c70aad7fcd4fa1aa71bb3fe32791ceeab4f/src/lib/Confetti.svelte#L135C5-L135C15
	const colorArray = [`url(${snow1})`, `url(${snow2})`, `url(${snow3})`];

	// This component is intended for short-term use, so we do not want to reimplement our E2E test suite for it. Instead, we skip it in headless E2E tests, as it is neither critical nor particularly meaningful for users.
	const headless = navigator.webdriver;
</script>

{#if !headless}
	<div
		class="pointer-events-none absolute -top-12 left-0 flex h-screen w-screen justify-center overflow-hidden text-white"
	>
		<Confetti
			x={[-5, 5]}
			y={[0, 0.1]}
			infinite
			duration={5000}
			amount={100}
			fallDistance="300px"
			{colorArray}
		/>
	</div>
{/if}

<script lang="ts">
	import IconAstronautArrow from '$lib/components/icons/IconAstronautArrow.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let fullWidth = false;
</script>

<button
	on:click
	class="login-button gap-4 rounded-2xl py-3 text-lg leading-6 font-bold sm:px-12 flex w-full items-center justify-center bg-brand-primary text-primary-inverted"
	class:sm:w-80={!fullWidth}
	data-tid="login-button"
>
	{$i18n.auth.text.authenticate}
	<IconAstronautArrow />
</button>

<style lang="scss">
	button.login-button:hover {
		:global(.svg-arrow-go path),
		:global(.svg-arrow-go line) {
			stroke-dashoffset: 20;
			transition-delay: 0s;
		}

		:global(.svg-arrow-go line) {
			transition-delay: 0.15s;
		}

		:global(.svg-vizor path) {
			transform: translateY(0);
		}

		:global(.svg-infinity path) {
			stroke-dasharray: 20px;
			stroke-dashoffset: 0;
			transition-delay: 0.6s;
			transition-duration: 1s;
		}
	}
</style>

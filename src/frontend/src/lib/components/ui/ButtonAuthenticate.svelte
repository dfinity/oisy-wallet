<script lang="ts">
	import IconAstronautArrow from '$lib/components/icons/IconAstronautArrow.svelte';
	import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		fullWidth?: boolean;
	}

	let { onclick, fullWidth = false }: Props = $props();
</script>

<button
	class="login-button flex w-full items-center justify-center gap-4 rounded-2xl bg-brand-primary py-3 text-lg font-bold leading-6 text-primary-inverted sm:px-12"
	class:sm:w-80={!fullWidth}
	data-tid={LOGIN_BUTTON}
	{onclick}
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

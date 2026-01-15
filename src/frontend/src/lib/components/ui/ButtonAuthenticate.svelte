<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onclick: () => void;
		fullWidth?: boolean;
		testId?: string;
		styleClass?: string;
		isPrimaryIdentityVersion2?: boolean;
		children: Snippet;
	}

	let {
		onclick,
		fullWidth = false,
		isPrimaryIdentityVersion2,
		styleClass,
		testId,
		children
	}: Props = $props();
</script>

<button
	class={`login-button flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-lg leading-6 font-bold whitespace-nowrap sm:max-w-none ${styleClass ?? ''}`}
	class:lg:px-6={!fullWidth}
	class:max-w-[24rem]={!fullWidth}
	class:px-12={fullWidth || !isPrimaryIdentityVersion2}
	class:px-4={!fullWidth}
	class:sm:w-80={!isPrimaryIdentityVersion2}
	class:sm:w-auto={!fullWidth && isPrimaryIdentityVersion2}
	data-tid={testId}
	{onclick}
>
	{@render children()}
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

<script lang="ts">
	import { IconGitHub } from '@dfinity/gix-components';
	import Alpha from '$lib/components/core/Alpha.svelte';
</script>

<footer class="flex flex-col justify-center items-center mt-8 pt-8 pb-4 px-2 gap-3 z-1">
	<div class="alpha">
		<Alpha />
	</div>

	<a
		href="https://github.com/dfinity/ic-eth-wallet"
		rel="external noopener noreferrer"
		target="_blank"
		class="flex gap-1 items-center text-interdimensional-blue font-bold no-underline"
	>
		<IconGitHub /> Source code on GitHub
	</a>
</footer>

<style lang="scss">
	@media (min-width: 1024px) and (min-height: 600px) {
		a {
			position: absolute;
			right: var(--padding-4x);
			bottom: var(--padding-6x);
		}

		.alpha {
			position: absolute;
			left: 50%;
			bottom: var(--padding-6x);
			transform: translate(-50%, var(--padding));
		}
	}
</style>

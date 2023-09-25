<script lang="ts">
	import { IconGitHub } from '@dfinity/gix-components';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
</script>

<footer class="flex flex-col justify-center items-center pt-8 mt-3 pb-4 px-2 gap-3 z-1">
	<a
		href={OISY_REPO_URL}
		rel="external noopener noreferrer"
		target="_blank"
		class="flex gap-1 items-center text-blue font-bold no-underline"
	>
		<IconGitHub /> Source code on GitHub
	</a>
</footer>

<style lang="scss">
	@media (min-width: 576px) and (min-height: 600px) {
		footer {
			position: absolute;
			left: 50%;
			bottom: var(--padding-2x);
			transform: translate(-50%, calc(-1 * var(--padding-4x)));

			width: 100%;

			margin: 0;
			padding: 0;
		}
	}
</style>

<script lang="ts">
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import IconGitHub from '$lib/components/icons/IconGitHub.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<footer class="hidden sm:flex flex-col justify-center items-center pt-8 mt-6 pb-4 px-4 gap-3 z-10">
	<a
		href={OISY_REPO_URL}
		rel="external noopener noreferrer"
		target="_blank"
		class="flex gap-1 items-center text-blue font-bold no-underline"
	>
		<IconGitHub />
		{$i18n.navigation.text.source_code_on_github}
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

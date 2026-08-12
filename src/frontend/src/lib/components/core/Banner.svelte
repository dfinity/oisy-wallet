<script lang="ts">
	import IconCloseThin from '$lib/components/icons/IconCloseThin.svelte';
	import IconGixWarning from '$lib/components/icons/IconGixWarning.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	let envBannerVisible = $state(true);

	const closeEnvBanner = () => (envBannerVisible = false);
</script>

<!-- Testing harness - DO NOT MERGE. This replaces the environment banner (staging / beta) rather
     than sitting next to it: both are fixed to the same slot, and this message contains what they
     say. It is deliberately unconditional - the only warning that survives into a deployed build,
     and the one that would show up if this branch ever reached production through a stray merge.
     The dismissal is the environment banner's: closeable, and back on the next load. Deliberately
     not translated, like the rest of the harness. -->
{#if envBannerVisible}
	<div
		class="test-banner fixed top-0 left-1/2 flex max-w-screen-md -translate-x-1/2 justify-between gap-4 border-4 border-solid border-black bg-error-primary"
	>
		<span class="flex items-center justify-center gap-4">
			<IconGixWarning size="48px" />
			<h3 class="clamp-4">
				Testing harness build - contains QA-only code that simulates failures. Never deploy to
				production.
			</h3>
		</span>
		<button aria-label={$i18n.core.text.close} onclick={closeEnvBanner}><IconCloseThin /></button>
	</div>
{/if}

<style lang="scss">
	div.test-banner {
		z-index: calc(var(--overlay-z-index) + 10);

		padding: var(--padding-2x) var(--padding-3x);
		margin: var(--padding-3x) 0;

		border-radius: var(--border-radius);

		width: calc(100% - var(--padding-4x));

		box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1215686275);
	}
</style>

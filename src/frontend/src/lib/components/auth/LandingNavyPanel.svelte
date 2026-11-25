<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		styleClass: string;
		children: Snippet;
	}

	let { styleClass, children }: Props = $props();
</script>

<!--
	The landing's two contrast blocks (Security, the closing card). They stay navy in both themes on
	purpose, so text inside sets fixed white and sky colours instead of the theme tokens, which flip.
	No text colour is set here: the sign-in buttons inside use currentColor for their icons.
-->
<div class="landing-navy overflow-hidden rounded-[32px] md:rounded-[40px] {styleClass}">
	{@render children()}
</div>

<style lang="scss">
	.landing-navy {
		// Marketing-only accents with no match in the theme palette (base-colors.scss), and fixed
		// in both themes; defined once here and read by the panels' content as --landing-sky.
		--landing-navy: #182b51;
		--landing-sky: #5bc9fc;

		background:
			radial-gradient(
				60% 80% at 50% 0%,
				color-mix(in srgb, var(--landing-sky) 25%, transparent),
				transparent 70%
			),
			var(--landing-navy);

		// The global focus ring (brand blue) is under 3:1 on navy; sky clears 7:1.
		:global(:focus-visible) {
			--color-background-brand-primary: var(--landing-sky);
		}
	}
</style>

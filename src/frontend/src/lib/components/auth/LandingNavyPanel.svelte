<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		styleClass?: string;
		children: Snippet;
	}

	let { styleClass = '', children }: Props = $props();
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
		--landing-navy: #182b51;
		--landing-sky: #5bc9fc;

		background:
			radial-gradient(60% 80% at 50% 0%, rgb(91 201 252 / 25%), transparent 70%),
			var(--landing-navy);
	}
</style>

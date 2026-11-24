<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import SignupsClosedBanner from '$lib/components/auth/SignupsClosedBanner.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import { MOTION_REDUCED_FADE_DURATION } from '$lib/constants/transition.constants';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { landingBackgroundFade } from '$lib/utils/landing-reveal.utils';
</script>

<div
	style:--landing-reduced-duration={`${MOTION_REDUCED_FADE_DURATION}ms`}
	class="mx-auto flex w-full max-w-screen-xl flex-1 flex-col items-center gap-8 px-5 md:gap-12 md:px-8"
	{@attach landingBackgroundFade}
>
	<div class="landing-enter flex w-full max-w-screen-md flex-col items-center">
		<SignupsClosedBanner />

		<HeroSignIn />
	</div>

	<div class="landing-enter artwork flex w-full justify-center">
		<div class="aspect-[1080/752] w-[90%]">
			{#await import('$lib/components/auth/LandingWalletPreview.svelte') then { default: LandingWalletPreview }}
				<LandingWalletPreview />
			{:catch}
				<!-- Keep the reserved space if the decorative artwork fails to load. -->
			{/await}
		</div>
	</div>

	<div class="flex w-full flex-col items-center">
		{#await import('$lib/components/auth/LandingSections.svelte') then { default: LandingSections }}
			<LandingSections />
		{:catch}
			<!-- The hero and its sign-in buttons stay usable if the sections fail to load. -->
		{/await}
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}

<style lang="scss">
	/* Keyboard focus reveals the controls immediately. */
	.landing-enter {
		// A one-time landing entrance deliberately settles more slowly than in-app controls.
		animation: landing-enter 300ms ease-out backwards;

		&:focus-within {
			// Reveal focused controls without removing/restarting the animation timeline.
			// Important declarations take precedence over animated property values.
			opacity: 1 !important;
			transform: none !important;
			filter: none !important;
		}
	}

	.artwork {
		animation-name: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.artwork:has(:global(svg)) {
			animation-name: landing-rise;
		}
	}

	@keyframes landing-enter {
		from {
			opacity: 0;
			transform: translateY(12px);
			filter: blur(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}

	@keyframes landing-rise {
		from {
			transform: translateY(12px);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes landing-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.landing-enter {
			animation: landing-fade var(--landing-reduced-duration) ease-out backwards;
		}
		.artwork {
			animation: none;
		}
	}
</style>

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import mainImageDark from '$lib/assets/main-image-dark.webp';
	import mainImageLight from '$lib/assets/main-image-light.webp';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import FeatureCards from '$lib/components/auth/FeatureCards.svelte';
	import SignupsClosedBanner from '$lib/components/auth/SignupsClosedBanner.svelte';
	import HeroSignIn from '$lib/components/hero/HeroSignIn.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { MOTION_REDUCED_FADE_DURATION } from '$lib/constants/transition.constants';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/theme.store';
	import { Theme } from '$lib/types/theme';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	const artworkSrc = $derived($themeStore === Theme.DARK ? mainImageDark : mainImageLight);

	const ariaLabel = $derived(replaceOisyPlaceholders($i18n.auth.alt.preview));
</script>

<div
	style:--landing-reduced-duration={`${MOTION_REDUCED_FADE_DURATION}ms`}
	class="mx-auto flex w-full max-w-screen-xl flex-1 flex-col items-center gap-8 px-5 md:gap-12 md:px-8"
>
	<div class="landing-enter flex w-full max-w-screen-md flex-col items-center">
		<SignupsClosedBanner />

		<HeroSignIn />
	</div>

	<div class="landing-enter artwork flex w-full justify-center">
		<Img
			alt={ariaLabel}
			height="1504"
			loading="eager"
			role="img"
			src={artworkSrc}
			styleClass="h-auto w-[90%] object-contain"
			width="2160"
		/>
	</div>

	<div class="landing-enter features w-full sm:-mt-48">
		<FeatureCards />
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}

<style lang="scss">
	/* Start with the page, without waiting for artwork. Keyboard focus reveals
	   controls immediately; intrinsic image dimensions keep the layout stable. */
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
		animation-delay: 100ms;
	}

	.features {
		// Opacity/filter on an ancestor prevent Chrome from blurring the cards' backdrop.
		animation-name: landing-rise;
		animation-delay: 200ms;
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
		.features {
			animation: none;
		}
	}
</style>

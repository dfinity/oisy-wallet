<script lang="ts">
	import IconSprinkles from '$lib/components/icons/IconSprinkles.svelte';
	import IconUpRight from '$lib/components/icons/lucide/IconUpRight.svelte';
	import Sprinkles from '$lib/components/sprinkles/Sprinkles.svelte';
	import { TRACK_SPRINKLES_BANNER_CLICK } from '$lib/constants/analytics.contants';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';

	const handleSprinklesBannerClick = () => {
		trackEvent({
			name: TRACK_SPRINKLES_BANNER_CLICK,
			metadata: {
				source: 'login-page'
			}
		});
	};
</script>

<a
	class="invite-rewards-banner"
	href="https://docs.oisy.com/rewards/oisy-sprinkles"
	onclick={handleSprinklesBannerClick}
	rel="noopener noreferrer"
	target="_blank"
>
	<div class="banner-content">
		<!-- Sprinkles Animation -->
		<Sprinkles type="box" />

		<IconSprinkles size="24" />

		<span class="banner-text text-base text-primary">{$i18n.rewards.text.banner_text}</span>
		<IconUpRight size="20" />
	</div>
</a>

<style lang="scss">
	.invite-rewards-banner {
		position: relative;
		border-radius: 1.5rem;
		border: 1px solid var(--color-background-secondary-alt);
		background: var(--color-background-primary);
		cursor: pointer;
		transition: transform 0.2s ease;
		width: fit-content;
		max-width: 100%;
		text-decoration: none;
		display: block;
		overflow: hidden; /* Contain the confetti within the banner */
	}

	.invite-rewards-banner:hover {
		transform: scale(1.02);
		text-decoration: none;
		color: var(--color-foreground-brand-primary-alt);
	}

	.invite-rewards-banner:hover .banner-text {
		color: var(--color-brand-primary-alt);
		transition: color 0.2s ease;
	}

	.banner-content {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: 1.5rem;
		white-space: nowrap;
		z-index: 1; /* Ensure content is above confetti */
	}

	.banner-text {
		transition: color 0.2s ease;
	}

	/* Responsive text */
	@media (max-width: 640px) {
		.banner-content {
			font-size: var(--font-size-sm);
		}
	}
</style>

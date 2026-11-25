<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import LandingNavyPanel from '$lib/components/auth/LandingNavyPanel.svelte';
	import { LANDING_REVEAL_STAGGER } from '$lib/constants/landing.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { landingReveal } from '$lib/utils/landing-reveal.utils';
</script>

<section class="w-full pb-16 md:pb-24" aria-labelledby="landing-close-title">
	<LandingNavyPanel styleClass="flex flex-col items-center gap-6 px-6 py-14 text-center md:py-24">
		<h2
			id="landing-close-title"
			class="m-0 max-w-[16ch] text-3xl leading-[1.1] font-bold tracking-tight text-balance text-white md:text-5xl"
			{@attach landingReveal()}
		>
			{$i18n.auth.landing.close_title}
		</h2>
		<p
			class="m-0 text-lg text-pretty text-white/78"
			{@attach landingReveal(LANDING_REVEAL_STAGGER)}
		>
			{$i18n.auth.landing.close_description}
		</p>

		<div class="w-full" {@attach landingReveal(2 * LANDING_REVEAL_STAGGER)}>
			<ButtonAuthenticateWithHelp
				helpAlignment="center"
				needHelpLink={false}
				testIdSuffix="-closing"
			/>
		</div>
	</LandingNavyPanel>
</section>

<style lang="scss">
	@use '$lib/styles/mixins/interaction';

	// The login buttons' usual translucent hover fill blends into the navy panel.
	section :global(button) {
		@include interaction.hover {
			background-color: color-mix(in srgb, var(--color-background-primary) 94%, var(--landing-sky));
			border-color: color-mix(in srgb, var(--color-background-primary) 60%, var(--landing-sky));
		}

		&:active {
			background-color: color-mix(in srgb, var(--color-background-primary) 90%, var(--landing-sky));
		}
	}

	// The sign-in block's terms line is tertiary grey, made for the light page; on navy it would
	// fall under 4.5:1, so it is lifted to translucent white here.
	section :global(.text-tertiary) {
		color: color-mix(in srgb, var(--color-foreground-white) 64%, transparent);
	}
</style>

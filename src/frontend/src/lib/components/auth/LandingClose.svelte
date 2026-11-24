<script lang="ts">
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import LandingNavyPanel from '$lib/components/auth/LandingNavyPanel.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { landingReveal } from '$lib/utils/landing-reveal.utils';
</script>

<section
	class="w-full pb-16 md:pb-24"
	{@attach landingReveal()}
	aria-labelledby="landing-close-title"
>
	<LandingNavyPanel styleClass="flex flex-col items-center gap-6 px-6 py-14 text-center md:py-24">
		<h2
			id="landing-close-title"
			class="m-0 max-w-[16ch] text-3xl leading-[1.1] font-bold tracking-tight text-balance text-white md:text-5xl"
		>
			{$i18n.auth.landing.close_title}
		</h2>
		<p class="m-0 text-lg text-pretty text-white/78">{$i18n.auth.landing.close_description}</p>

		<ButtonAuthenticateWithHelp
			helpAlignment="center"
			needHelpLink={false}
			testIdSuffix="-closing"
		/>
	</LandingNavyPanel>
</section>

<style lang="scss">
	// The login buttons' usual translucent hover fill blends into the navy panel.
	section :global(button) {
		@media (hover: hover) {
			&:hover {
				background-color: color-mix(
					in srgb,
					var(--color-background-primary) 94%,
					var(--landing-sky)
				);
				border-color: color-mix(in srgb, var(--color-background-primary) 60%, var(--landing-sky));
			}
		}

		&:active {
			background-color: color-mix(in srgb, var(--color-background-primary) 90%, var(--landing-sky));
		}

		&:focus-visible {
			--color-background-brand-primary: var(--landing-sky);
		}
	}

	// The sign-in block's terms line is tertiary grey, made for the light page; on navy it would
	// fall under 4.5:1, so it is lifted to translucent white here.
	section :global(.text-tertiary) {
		color: rgb(255 255 255 / 64%);
	}
</style>

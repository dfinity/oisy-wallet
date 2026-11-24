<script lang="ts">
	import LandingNavyPanel from '$lib/components/auth/LandingNavyPanel.svelte';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconNetworks from '$lib/components/icons/lucide/IconNetworks.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	const pillars = $derived([
		{
			id: 'sign-in',
			Icon: IconLock,
			title: $i18n.auth.landing.security_sign_in_title,
			description: $i18n.auth.landing.security_sign_in_description
		},
		{
			id: 'keys',
			Icon: IconNetworks,
			title: $i18n.auth.landing.security_keys_title,
			description: replaceOisyPlaceholders($i18n.auth.landing.security_keys_description)
		},
		{
			id: 'first-send',
			Icon: IconShieldCheck,
			title: $i18n.auth.landing.security_first_send_title,
			description: $i18n.auth.landing.security_first_send_description
		},
		{
			id: 'privacy',
			Icon: IconEyeOff,
			title: $i18n.auth.landing.security_privacy_title,
			description: $i18n.auth.landing.security_privacy_description
		}
	]);
</script>

<section
	id="landing-security"
	class="w-full scroll-mt-6 pb-16 md:pb-24"
	aria-labelledby="landing-security-title"
	tabindex="-1"
>
	<LandingNavyPanel styleClass="px-6 py-14 md:px-12 md:py-20">
		<div class="flex flex-col gap-10 md:gap-12">
			<div class="flex max-w-3xl flex-col gap-5" {@attach landingReveal()}>
				<p class="m-0 text-xs font-bold tracking-[0.2em] text-(--landing-sky) uppercase">
					{$i18n.auth.landing.security_eyebrow}
				</p>
				<h2
					id="landing-security-title"
					class="m-0 text-3xl leading-[1.1] font-bold tracking-tight text-balance text-white md:text-[2.75rem]"
				>
					{$i18n.auth.landing.security_title}
				</h2>
				<p class="m-0 text-lg leading-relaxed text-pretty text-white/78">
					{$i18n.auth.landing.security_description}
				</p>
			</div>

			<ul class="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
				{#each pillars as { id, Icon, title, description }, index (id)}
					<li
						class="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-7"
						{@attach landingReveal(LANDING_REVEAL_STAGGER * (index + 1))}
					>
						<span class="text-(--landing-sky)" aria-hidden="true"><Icon size="24" /></span>
						<h3 class="m-0 text-xl font-bold text-balance text-white">{title}</h3>
						<p class="m-0 text-base leading-relaxed text-pretty text-white/72">{description}</p>
					</li>
				{/each}
			</ul>

			<p class="m-0 text-sm leading-relaxed text-pretty text-white/60" {@attach landingReveal()}>
				{$i18n.auth.landing.security_foundation}
				<ExternalLink
					ariaLabel={$i18n.auth.landing.security_source}
					href={OISY_REPO_URL}
					iconVisible={false}
					styleClass="source-link"
				>
					{$i18n.auth.landing.security_source}
				</ExternalLink>
			</p>
		</div>
	</LandingNavyPanel>
</section>

<style lang="scss">
	// ExternalLink's brand blue is too dark on navy; the sky accent keeps the link readable.
	section :global(.source-link) {
		color: var(--landing-sky);
		text-decoration: underline;
		text-underline-offset: 3px;

		&:hover {
			color: white;
		}
	}
</style>

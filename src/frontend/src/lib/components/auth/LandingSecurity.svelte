<script lang="ts">
	import internetComputerLogo from '$icp/assets/icp-light.svg?inline';
	import trailOfBitsLogo from '$lib/assets/trail-of-bits-white.svg?inline';
	import LandingHeading from '$lib/components/auth/LandingHeading.svelte';
	import LandingNavyPanel from '$lib/components/auth/LandingNavyPanel.svelte';
	import IconLock from '$lib/components/icons/IconLock.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import IconNetworks from '$lib/components/icons/lucide/IconNetworks.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { LANDING_REVEAL_STAGGER, LANDING_SECTION_IDS } from '$lib/constants/landing.constants';
	import { OISY_REPO_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { landingReveal } from '$lib/utils/landing-reveal.utils';

	const AUDIT_REPORT_URL =
		'https://github.com/trailofbits/publications/blob/master/reviews/2025-09-dfinity-oisy-securityreview.pdf';

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

<!-- A jump target, never a Tab stop: see LandingSection. -->
<section
	id={LANDING_SECTION_IDS.security}
	class="w-full scroll-mt-6 pb-16 outline-none md:pb-24"
	aria-labelledby={`${LANDING_SECTION_IDS.security}-title`}
	tabindex="-1"
>
	<LandingNavyPanel styleClass="px-6 py-14 md:px-12 md:py-20">
		<div class="flex flex-col gap-10 md:gap-12">
			<div class="flex max-w-3xl flex-col gap-5" {@attach landingReveal()}>
				<LandingHeading
					id={`${LANDING_SECTION_IDS.security}-title`}
					description={$i18n.auth.landing.security_description}
					eyebrow={$i18n.auth.landing.security_eyebrow}
					onNavy
					title={$i18n.auth.landing.security_title}
				/>
			</div>

			<!-- `role="list"`: Safari drops the semantics of a list without bullets. -->
			<ul class="m-0 grid list-none gap-4 p-0 md:grid-cols-2" role="list">
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

			<div class="flex flex-col gap-5" {@attach landingReveal()}>
				<div
					class="grid items-center gap-x-4 gap-y-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
				>
					<div class="flex items-center gap-3 sm:contents">
						<img
							class="h-auto w-16 shrink-0 sm:row-span-2 sm:w-20"
							alt="Trail of Bits"
							height="159"
							src={trailOfBitsLogo}
							width="265"
						/>
						<h3 class="m-0 text-base font-bold text-balance text-white">
							{$i18n.auth.landing.security_audit_title}
						</h3>
					</div>
					<p class="m-0 text-sm leading-relaxed text-pretty text-white/72 sm:col-start-2">
						{$i18n.auth.landing.security_audit_description}
					</p>
					<ExternalLink
						ariaLabel={$i18n.auth.landing.security_audit}
						href={AUDIT_REPORT_URL}
						iconAsLast
						iconSize="16"
						styleClass="source-link min-h-10 justify-self-start text-sm font-semibold sm:col-start-2 lg:col-start-3 lg:row-span-2 lg:row-start-1"
					>
						{$i18n.auth.landing.security_audit}
					</ExternalLink>
				</div>

				<div class="flex flex-wrap items-center gap-x-3 text-sm leading-relaxed text-white/60">
					<ExternalLink
						ariaLabel={$i18n.auth.landing.security_foundation_link}
						href="https://internetcomputer.org/"
						iconVisible={false}
						styleClass="source-link min-h-10 font-semibold"
					>
						<img class="size-5 shrink-0" alt="" src={internetComputerLogo} />
						{$i18n.auth.landing.security_foundation_link}
					</ExternalLink>
					<p class="m-0 text-pretty">
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
			</div>
		</div>
	</LandingNavyPanel>
</section>

<style lang="scss">
	@use '$lib/styles/mixins/interaction';

	// ExternalLink's brand blue is too dark on navy; the sky accent keeps the link readable.
	section :global(.source-link) {
		color: var(--landing-sky);
		text-decoration: underline;
		text-underline-offset: 3px;

		@include interaction.hover {
			color: var(--color-foreground-white);
		}
	}
</style>

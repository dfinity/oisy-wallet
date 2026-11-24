<script lang="ts">
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import LandingCurrencyPreview from '$lib/components/auth/LandingCurrencyPreview.svelte';
	import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
	import { Currency } from '$lib/enums/currency';
	import { Languages } from '$lib/enums/languages';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	// Counted from the data the wallet ships with, so the page never drifts from the product.
	const facts = $derived([
		{
			id: 'currencies',
			value: Object.values(Currency).length,
			label: $i18n.auth.landing.connect_currencies
		},
		{
			id: 'languages',
			value: Object.values(Languages).length,
			label: $i18n.auth.landing.connect_languages
		},
		{ id: 'apps', value: dAppDescriptions.length, label: $i18n.auth.landing.connect_apps },
		{ id: 'networks', value: LANDING_NETWORKS.length, label: $i18n.auth.landing.connect_networks }
	]);
</script>

<section
	class="grid w-full grid-cols-1 items-center gap-10 border-t border-tertiary py-16 md:grid-cols-2 md:gap-16 md:py-24"
	aria-labelledby="landing-connect-title"
>
	<div class="flex flex-col gap-8">
		<div class="flex flex-col gap-5" {@attach landingReveal()}>
			<p class="m-0 text-xs font-bold tracking-[0.2em] text-brand-primary uppercase">
				{$i18n.auth.landing.connect_eyebrow}
			</p>
			<h2
				id="landing-connect-title"
				class="m-0 text-3xl leading-[1.1] font-bold tracking-tight text-balance text-primary md:text-[2.75rem]"
			>
				{$i18n.auth.landing.connect_title}
			</h2>
			<p class="m-0 text-lg leading-relaxed text-pretty text-secondary">
				{replaceOisyPlaceholders($i18n.auth.landing.connect_description)}
			</p>
		</div>

		<dl class="m-0 grid grid-cols-2 gap-x-6 gap-y-5">
			{#each facts as { id, value, label }, index (id)}
				<div
					class="flex flex-col-reverse justify-end gap-1 border-t border-tertiary pt-4"
					{@attach landingReveal(LANDING_REVEAL_STAGGER * index)}
				>
					<dt class="text-sm leading-snug text-pretty text-secondary">{label}</dt>
					<dd class="m-0 text-4xl font-bold tracking-tight text-primary">{value}</dd>
				</div>
			{/each}
		</dl>
	</div>

	<div
		class="mx-auto w-full max-w-lg md:max-w-none"
		{@attach landingReveal(LANDING_REVEAL_STAGGER)}
	>
		<LandingCurrencyPreview />
	</div>
</section>

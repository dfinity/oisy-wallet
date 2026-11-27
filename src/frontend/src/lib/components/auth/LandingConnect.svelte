<script lang="ts">
	import { dAppDescriptions } from '$env/dapp-descriptions.env';
	import LandingCurrencyPreview from '$lib/components/auth/LandingCurrencyPreview.svelte';
	import LandingHeading from '$lib/components/auth/LandingHeading.svelte';
	import { LANDING_NETWORKS, LANDING_REVEAL_STAGGER } from '$lib/constants/landing.constants';
	import { Currency } from '$lib/enums/currency';
	import { Languages } from '$lib/enums/languages';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { landingReveal } from '$lib/utils/landing-reveal.utils';

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
	class="grid w-full grid-cols-1 items-center gap-10 border-t border-tertiary py-16 md:grid-cols-12 md:gap-16 md:py-24"
	aria-labelledby="landing-connect-title"
>
	<div class="flex min-w-0 flex-col gap-6 md:col-span-5">
		<div class="flex flex-col gap-5" {@attach landingReveal()}>
			<LandingHeading
				id="landing-connect-title"
				description={replaceOisyPlaceholders($i18n.auth.landing.connect_description)}
				eyebrow={$i18n.auth.landing.connect_eyebrow}
				title={$i18n.auth.landing.connect_title}
			/>
		</div>

		<dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-tertiary pt-4">
			{#each facts as { id, value, label }, index (id)}
				<div
					class="flex flex-row-reverse items-baseline justify-end gap-2"
					{@attach landingReveal(LANDING_REVEAL_STAGGER * index)}
				>
					<dt class="text-sm leading-snug text-pretty text-secondary">{label}</dt>
					<dd class="m-0 text-xl font-bold text-primary tabular-nums">{value}</dd>
				</div>
			{/each}
		</dl>
	</div>

	<div class="min-w-0 md:col-span-7" {@attach landingReveal(LANDING_REVEAL_STAGGER)}>
		<LandingCurrencyPreview />
	</div>
</section>

<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	const numberFormat = $derived(new Intl.NumberFormat($i18n.lang));
	const steps = $derived([
		{
			id: 'sign-in',
			title: $i18n.auth.landing.get_started_sign_in_title,
			description: $i18n.auth.landing.get_started_sign_in_description
		},
		{
			id: 'fund',
			title: $i18n.auth.landing.get_started_fund_title,
			description: $i18n.auth.landing.get_started_fund_description
		},
		{
			id: 'use',
			title: $i18n.auth.landing.get_started_use_title,
			description: $i18n.auth.landing.get_started_use_description
		}
	]);
</script>

<section
	class="flex w-full flex-col gap-7 pb-16 md:gap-10 md:pb-24"
	aria-labelledby="landing-get-started-title"
>
	<h2
		id="landing-get-started-title"
		class="m-0 text-3xl leading-[1.1] font-bold tracking-tight text-balance text-primary md:text-[2.75rem]"
		{@attach landingReveal()}
	>
		{$i18n.auth.landing.get_started_title}
	</h2>

	<ol class="m-0 grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8" role="list">
		{#each steps as { id, title, description }, index (id)}
			<li
				class="flex items-start gap-4"
				{@attach landingReveal(LANDING_REVEAL_STAGGER * (index + 1))}
			>
				<span
					class="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary"
					aria-hidden="true"
				>
					{numberFormat.format(index + 1)}
				</span>
				<div class="flex min-w-0 flex-col gap-1.5">
					<h3 class="m-0 text-lg font-bold text-balance text-primary">{title}</h3>
					<p class="m-0 text-base leading-relaxed text-pretty text-secondary">{description}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

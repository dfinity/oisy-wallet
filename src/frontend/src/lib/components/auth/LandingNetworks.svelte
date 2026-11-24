<script lang="ts">
	import { LANDING_NETWORKS } from '$lib/constants/landing.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';
</script>

<!-- The wallet artwork above draws its phone past its own box, so this block clears it. -->
<div class="flex flex-col items-center gap-7 pt-16 pb-16 text-center sm:pt-28 md:pb-24">
	<p
		class="m-0 text-2xl leading-tight font-bold tracking-tight text-balance text-primary md:text-4xl"
		{@attach landingReveal()}
	>
		{$i18n.auth.landing.reframe_start}
		<span class="text-tertiary">{$i18n.auth.landing.reframe_end}</span>
	</p>

	<ul
		class="m-0 flex max-w-3xl list-none flex-wrap justify-center gap-2 p-0"
		{@attach landingReveal(LANDING_REVEAL_STAGGER)}
		aria-label={replaceOisyPlaceholders($i18n.auth.landing.networks_label)}
	>
		{#each LANDING_NETWORKS as { id, name, icon, iconColored } (id)}
			<li
				class="flex items-center gap-2 rounded-full bg-primary py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-primary shadow-sm"
			>
				{#if iconColored ?? icon}
					<!-- The brand-coloured marks read on both themes; the monochrome ones are dark-only. -->
					<img class="size-6 rounded-full" alt="" src={iconColored ?? icon} />
				{/if}
				{name}
			</li>
		{/each}
	</ul>
</div>

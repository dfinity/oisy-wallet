<script lang="ts">
	import type { Snippet } from 'svelte';
	import LandingHeading from '$lib/components/auth/LandingHeading.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import { LANDING_REVEAL_STAGGER } from '$lib/constants/landing.constants';
	import { landingReveal } from '$lib/utils/landing-reveal.utils';

	interface Props {
		id: string;
		eyebrow: string;
		title: string;
		description: string;
		points: string[];
		flip?: boolean;
		visual: Snippet;
	}

	let { id, eyebrow, title, description, points, flip = false, visual }: Props = $props();
</script>

<!--
	A jump target, never a Tab stop: it takes focus so the next Tab and a screen reader continue here,
	but draws no ring (Safari outlines a focused fragment target by default).
-->
<section
	{id}
	class="grid w-full scroll-mt-6 grid-cols-1 items-center gap-10 border-t border-tertiary py-16 outline-none md:grid-cols-12 md:gap-16 md:py-24"
	aria-labelledby={`${id}-title`}
	tabindex="-1"
>
	<div class="flex flex-col gap-5 md:col-span-5" class:md:order-2={flip}>
		<div class="flex flex-col gap-5" {@attach landingReveal()}>
			<LandingHeading id={`${id}-title`} {eyebrow} {title} />
		</div>
		<!-- Outside the heading block, so it enters one stagger after it. -->
		<p
			class="m-0 text-lg leading-relaxed text-pretty text-secondary"
			{@attach landingReveal(LANDING_REVEAL_STAGGER)}
		>
			{description}
		</p>

		{#if points.length > 0}
			<!-- `role="list"`: Safari drops the semantics of a list without bullets. -->
			<ul
				class="m-0 mt-1 flex list-none flex-col gap-3 p-0"
				{@attach landingReveal(2 * LANDING_REVEAL_STAGGER)}
				role="list"
			>
				{#each points as point (point)}
					<li class="flex gap-3 text-base leading-normal text-pretty text-secondary">
						<span class="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true">
							<IconCheck size="20" />
						</span>
						{point}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="md:col-span-7" {@attach landingReveal(3 * LANDING_REVEAL_STAGGER)}>
		{@render visual()}
	</div>
</section>

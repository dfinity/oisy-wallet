<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	interface Props {
		id: string;
		eyebrow: string;
		title: string;
		description: string;
		points?: string[];
		flip?: boolean;
		visual: Snippet;
	}

	let { id, eyebrow, title, description, points = [], flip = false, visual }: Props = $props();
</script>

<section
	class="grid w-full grid-cols-1 items-center gap-10 border-t border-tertiary py-16 md:grid-cols-12 md:gap-16 md:py-24"
	aria-labelledby={`${id}-title`}
>
	<div class="flex flex-col gap-5 md:col-span-5" class:md:order-2={flip} {@attach landingReveal()}>
		<p class="m-0 text-xs font-bold tracking-[0.2em] text-brand-primary uppercase">{eyebrow}</p>
		<h2
			id={`${id}-title`}
			class="m-0 text-3xl leading-[1.1] font-bold tracking-tight text-balance text-primary md:text-[2.75rem]"
		>
			{title}
		</h2>
		<p class="m-0 text-lg leading-relaxed text-pretty text-secondary">{description}</p>

		{#if points.length > 0}
			<ul class="m-0 mt-1 flex list-none flex-col gap-3 p-0">
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

	<div class="md:col-span-7" {@attach landingReveal(LANDING_REVEAL_STAGGER)}>
		{@render visual()}
	</div>
</section>

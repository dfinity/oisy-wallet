<script lang="ts">
	import payPhone from '$lib/assets/landing-pay-phone.webp';
	import tipClaim from '$lib/assets/landing-tip-claim.webp';
	import { i18n } from '$lib/stores/i18n.store';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	const cards = $derived([
		{
			id: 'pay',
			title: $i18n.auth.landing.pay_title,
			description: $i18n.auth.landing.pay_description,
			image: payPhone,
			alt: $i18n.auth.landing.pay_preview
		},
		{
			id: 'tip',
			title: $i18n.auth.landing.tip_title,
			description: $i18n.auth.landing.tip_description,
			image: tipClaim,
			alt: $i18n.auth.landing.tip_preview
		}
	]);
</script>

<section
	class="flex w-full flex-col gap-10 border-t border-tertiary py-16 md:gap-12 md:py-24"
	aria-labelledby="landing-give-title"
>
	<div class="flex max-w-3xl flex-col gap-5" {@attach landingReveal()}>
		<p class="m-0 text-xs font-bold tracking-[0.2em] text-brand-primary uppercase">
			{$i18n.auth.landing.give_eyebrow}
		</p>
		<h2
			id="landing-give-title"
			class="m-0 text-3xl leading-[1.1] font-bold tracking-tight text-balance text-primary md:text-[2.75rem]"
		>
			{$i18n.auth.landing.give_title}
		</h2>
	</div>

	<div class="grid gap-5 md:grid-cols-2">
		{#each cards as { id, title, description, image, alt }, index (id)}
			<article
				class="grid grid-rows-[auto_1fr] overflow-hidden rounded-[28px] border border-tertiary bg-primary"
				{@attach landingReveal(LANDING_REVEAL_STAGGER * (index + 1))}
			>
				<div class="flex flex-col gap-2 px-6 pt-7 md:px-8 md:pt-8">
					<h3 class="m-0 text-xl font-bold text-balance text-primary">{title}</h3>
					<p class="m-0 text-base leading-relaxed text-pretty text-secondary">{description}</p>
				</div>

				<div
					class="art flex min-h-72 items-end justify-center px-6 pt-8 md:min-h-90 md:px-8"
					class:tip={id === 'tip'}
				>
					{#if id === 'pay'}
						<img
							class="aspect-[2/1] w-full rounded-t-2xl object-cover"
							{alt}
							decoding="async"
							height="600"
							loading="lazy"
							src={image}
							width="1200"
						/>
					{:else}
						<!-- A phone frame around the Tips claim screen, cropped at the fold. -->
						<div
							class="phone aspect-[780/1100] w-[min(260px,70%)] overflow-hidden rounded-t-[34px] border-8 border-b-0"
						>
							<img
								class="size-full object-cover object-top"
								{alt}
								decoding="async"
								height="734"
								loading="lazy"
								src={image}
								width="520"
							/>
						</div>
					{/if}
				</div>
			</article>
		{/each}
	</div>
</section>

<style lang="scss">
	.art {
		background: linear-gradient(
			180deg,
			var(--color-background-primary) 0%,
			var(--color-background-brand-subtle-10) 100%
		);

		&.tip {
			background: linear-gradient(
				180deg,
				var(--color-background-primary) 0%,
				var(--color-background-warning-subtle-10) 100%
			);
		}
	}

	.phone {
		// The device bezel is the same near-black in both themes, like a real phone.
		border-color: #0f172a;
		box-shadow: 0 30px 60px -30px rgb(15 23 42 / 45%);
	}
</style>

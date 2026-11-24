<script lang="ts">
	import payDark from '$lib/assets/landing-pay-dark.webp';
	import payLight from '$lib/assets/landing-pay-light.webp';
	import tipDark from '$lib/assets/landing-tip-dark.webp';
	import tipLight from '$lib/assets/landing-tip-light.webp';
	import { i18n } from '$lib/stores/i18n.store';
	import { LANDING_REVEAL_STAGGER, landingReveal } from '$lib/utils/landing-reveal.utils';

	const cards = $derived([
		{
			id: 'pay',
			title: $i18n.auth.landing.pay_title,
			description: $i18n.auth.landing.pay_description,
			light: payLight,
			dark: payDark,
			alt: $i18n.auth.landing.pay_preview
		},
		{
			id: 'tip',
			title: $i18n.auth.landing.tip_title,
			description: $i18n.auth.landing.tip_description,
			light: tipLight,
			dark: tipDark,
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
		{#each cards as { id, title, description, light, dark, alt }, index (id)}
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
					<!-- Both cards share one phone frame, cropped at the fold, so the two phones line up. -->
					<div class="relative w-[min(260px,70%)]">
						<div
							class="phone aspect-[780/1100] w-full overflow-hidden rounded-t-[34px] border-8 border-b-0"
						>
							<!-- One screen per theme; the inactive one is display:none, so screen readers announce only one. -->
							<img
								class="size-full object-cover object-top dark:hidden"
								{alt}
								decoding="async"
								height="733"
								loading="lazy"
								src={light}
								width="520"
							/>
							<img
								class="hidden size-full object-cover object-top dark:block"
								{alt}
								decoding="async"
								height="733"
								loading="lazy"
								src={dark}
								width="520"
							/>
						</div>

						{#if id === 'pay'}
							<div
								class="pay-chip absolute top-[12%] -left-[26%] flex w-[54%] -rotate-[9deg] items-center rounded-[18px] bg-surface px-[9%] py-[6.5%] text-primary"
								aria-hidden="true"
							>
								<svg class="h-auto w-full" fill="none" viewBox="0 0 186 64">
									<circle cx="32" cy="32" fill="#0066FF" r="32" />
									<path
										clip-rule="evenodd"
										d="M35.5086 48.6098L34.7387 52.0151C34.6237 52.5235 34.1374 52.859 33.6222 52.7793C32.4482 52.5979 31.2584 52.3894 30.0564 52.1591C29.5045 52.0534 29.1526 51.5103 29.2765 50.9622L29.9735 47.8793C29.4854 47.7837 28.9942 47.6803 28.5005 47.5698C28.0554 47.4682 27.6147 47.3623 27.1789 47.2517L26.4822 50.3336C26.3583 50.8815 25.8076 51.2203 25.264 51.079C24.0798 50.771 22.916 50.449 21.778 50.1097C21.2778 49.9605 20.9822 49.448 21.0973 48.9389L21.8632 45.5512C14.2939 42.5159 9.51524 37.3571 11.5435 28.5473L12.0315 26.3886C13.9943 17.5457 20.5251 14.9543 28.6628 15.4753L29.4282 12.0899C29.5433 11.5807 30.0307 11.2452 30.5465 11.3258C31.7197 11.5091 32.9088 11.719 34.1103 11.9505C34.6618 12.0567 35.0132 12.5995 34.8893 13.1473L34.1926 16.2292C34.6335 16.3169 35.0769 16.4109 35.5224 16.5107C36.016 16.6223 36.5041 16.7393 36.986 16.8621L37.6823 13.782C37.8062 13.2339 38.3575 12.895 38.9012 13.037C40.0853 13.3461 41.2491 13.6697 42.387 14.0108C42.8864 14.1605 43.1812 14.6726 43.0662 15.1811L42.2985 18.577C49.7691 21.6116 54.4382 26.7666 52.4573 35.5281L51.9693 37.6869C50.0233 46.4547 43.5626 49.0795 35.5086 48.6098ZM46.4916 35.933L46.7663 34.7182C48.7004 26.6813 42.2694 23.6796 34.3411 21.771C26.3257 20.075 19.2288 20.0183 17.5176 28.1056L17.2429 29.3204C15.3004 37.3941 21.7315 40.3958 29.6969 42.3128C37.6752 44.0004 44.7721 44.0571 46.4916 35.933Z"
										fill="white"
										fill-rule="evenodd"
									/>
									<path
										d="M158.109 18.9102L165.804 28.3476L173.518 18.9102H185.697L170.934 36.2382V45.2253H160.674V36.2382L145.911 18.9102H158.109Z"
										fill="currentColor"
									/>
									<path
										d="M132.498 26.5267L128.876 34.2998H136.101L132.498 26.5267ZM112.272 45.2253L126.389 18.9102L138.588 18.9102L152.705 45.2253H141.153L139.077 40.722H125.9L123.825 45.2253H112.272Z"
										fill="currentColor"
									/>
									<path
										d="M91.7141 31.0881H104.245C104.852 31.0881 105.381 30.8727 105.812 30.442C106.262 29.9916 106.477 29.463 106.477 28.856C106.477 28.2294 106.262 27.7008 105.812 27.27C105.381 26.8197 104.852 26.6043 104.245 26.6043H91.7141V31.0881ZM81.4543 18.9095H106.81C112.234 18.8508 116.835 23.4128 116.757 28.856C116.835 34.2796 112.234 38.8808 106.81 38.8025H91.7141V45.2247H81.4543V18.9095Z"
										fill="currentColor"
									/>
								</svg>
							</div>
						{/if}
					</div>
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

	.pay-chip {
		box-shadow:
			0 0 0 1px rgb(15 23 42 / 6%),
			0 24px 48px -16px rgb(15 23 42 / 30%);
	}

	// On the dark card the near-black bezel and a dark shadow vanish; a faint light edge keeps both shapes.
	:global([theme='dark']) {
		.phone {
			box-shadow:
				0 0 0 1px rgb(255 255 255 / 10%),
				0 30px 60px -30px rgb(0 0 0 / 60%);
		}

		.pay-chip {
			box-shadow:
				0 0 0 1px rgb(255 255 255 / 12%),
				0 24px 48px -16px rgb(0 0 0 / 60%);
		}
	}
</style>

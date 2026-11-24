<script lang="ts">
	import { onDestroy } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import LandingCurrencyFlag from '$lib/components/auth/LandingCurrencyFlag.svelte';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { Currency } from '$lib/enums/currency';
	import { Languages } from '$lib/enums/languages';
	import { i18n } from '$lib/stores/i18n.store';
	import { fly } from '$lib/utils/transitions.utils';

	// The Hold preview's sample total, shown through illustrative rates; not live prices.
	const BALANCE_USD = 59_532.83;
	const SAMPLE_RATES: Record<Currency, number> = {
		[Currency.AED]: 3.67,
		[Currency.BRL]: 5.35,
		[Currency.CAD]: 1.4,
		[Currency.CHF]: 0.8,
		[Currency.CNY]: 7.1,
		[Currency.CZK]: 20.9,
		[Currency.EUR]: 0.86,
		[Currency.GBP]: 0.76,
		[Currency.INR]: 88.5,
		[Currency.JPY]: 155,
		[Currency.KRW]: 1460,
		[Currency.NGN]: 1450,
		[Currency.PLN]: 3.65,
		[Currency.RUB]: 80,
		[Currency.SAR]: 3.75,
		[Currency.SGD]: 1.3,
		[Currency.USD]: 1,
		[Currency.VND]: 26_300
	};

	// One pass through these pairs, then the preview rests on the visitor's own currency.
	const TOUR: { currency: Currency; language: Languages }[] = [
		{ currency: Currency.USD, language: Languages.ENGLISH },
		{ currency: Currency.EUR, language: Languages.GERMAN },
		{ currency: Currency.CHF, language: Languages.FRENCH },
		{ currency: Currency.JPY, language: Languages.JAPANESE },
		{ currency: Currency.INR, language: Languages.HINDI },
		{ currency: Currency.BRL, language: Languages.PORTUGUESE },
		{ currency: Currency.KRW, language: Languages.KOREAN },
		{ currency: Currency.PLN, language: Languages.POLISH },
		{ currency: Currency.VND, language: Languages.VIETNAMESE }
	];
	const STEP_MS = 1800;

	const currencies = Object.values(Currency);

	let step = $state<number | undefined>();
	let timer: ReturnType<typeof setInterval> | undefined;

	const stop = () => {
		clearInterval(timer);
		timer = undefined;
	};

	const tour = () => {
		step = 0;
		timer = setInterval(() => {
			if (step === undefined || step >= TOUR.length - 1) {
				stop();
				step = undefined;
				return;
			}
			step++;
		}, STEP_MS);
	};

	const playOnceWhenVisible = (node: HTMLElement) => {
		if (prefersReducedMotion.current || typeof IntersectionObserver === 'undefined') {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			if (!entry?.isIntersecting) {
				return;
			}
			observer.disconnect();
			tour();
		});

		observer.observe(node);

		return () => observer.disconnect();
	};

	onDestroy(stop);

	let current = $derived(
		step === undefined
			? (TOUR.find(({ currency }) => currency === $currentCurrency) ?? {
					currency: $currentCurrency,
					language: Languages.ENGLISH
				})
			: TOUR[step]
	);

	const format = ({ currency, language }: { currency: Currency; language: Languages }): string =>
		new Intl.NumberFormat(language, {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(BALANCE_USD * SAMPLE_RATES[currency]);

	const autonym = (language: Languages): string => {
		const name = new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language;
		return `${name.charAt(0).toLocaleUpperCase(language)}${name.slice(1)}`;
	};
</script>

<LandingPreviewFrame label={$i18n.auth.landing.connect_preview}>
	<div class="flex flex-col gap-6 p-5 sm:p-7" {@attach playOnceWhenVisible}>
		<div class="flex items-center justify-between gap-3">
			<span class="text-sm text-tertiary">{$i18n.hero.text.available_balance}</span>
			<span class="grid">
				{#key current.language}
					<span
						class="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary [grid-area:1/1]"
						lang={current.language}
						in:fly={{ y: 8 }}
						out:fly={{ y: -8 }}
					>
						{autonym(current.language)}
					</span>
				{/key}
			</span>
		</div>

		<div class="grid min-h-12 items-center overflow-hidden">
			{#key current.currency}
				<span
					class="flex items-center gap-3 [grid-area:1/1]"
					in:fly={{ y: 16 }}
					out:fly={{ y: -16 }}
				>
					<LandingCurrencyFlag currency={current.currency} size={36} />
					<span
						class="truncate text-3xl font-bold tracking-tight text-primary sm:text-4xl"
						lang={current.language}
					>
						{format(current)}
					</span>
				</span>
			{/key}
		</div>

		<ul class="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-6">
			{#each currencies as currency (currency)}
				<li
					class="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold uppercase transition-colors duration-300"
					class:bg-brand-subtle-20={currency === current.currency}
					class:text-brand-primary={currency === current.currency}
					class:text-tertiary={currency !== current.currency}
				>
					<LandingCurrencyFlag {currency} size={18} />
					{currency}
				</li>
			{/each}
		</ul>
	</div>
</LandingPreviewFrame>

<script lang="ts">
	import { LANGUAGES } from '$env/i18n';
	import LandingCurrencyFlag from '$lib/components/auth/LandingCurrencyFlag.svelte';
	import LandingPreviewFrame from '$lib/components/auth/LandingPreviewFrame.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { Currency } from '$lib/enums/currency';
	import { Languages } from '$lib/enums/languages';
	import { i18n, loadLanguage } from '$lib/stores/i18n.store';

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
	const PREVIEW_LANGUAGES: Partial<Record<Currency, Languages>> = {
		[Currency.BRL]: Languages.PORTUGUESE,
		[Currency.CAD]: Languages.ENGLISH,
		[Currency.CHF]: Languages.FRENCH,
		[Currency.CNY]: Languages.CHINESE_SIMPLIFIED,
		[Currency.CZK]: Languages.CZECH,
		[Currency.EUR]: Languages.GERMAN,
		[Currency.GBP]: Languages.ENGLISH,
		[Currency.INR]: Languages.HINDI,
		[Currency.JPY]: Languages.JAPANESE,
		[Currency.KRW]: Languages.KOREAN,
		[Currency.NGN]: Languages.ENGLISH,
		[Currency.PLN]: Languages.POLISH,
		[Currency.RUB]: Languages.RUSSIAN,
		[Currency.SGD]: Languages.ENGLISH,
		[Currency.USD]: Languages.ENGLISH,
		[Currency.VND]: Languages.VIETNAMESE
	};

	const getPreviewLabels = ({ lang, hero, core }: Awaited<ReturnType<typeof loadLanguage>>) => ({
		lang,
		balance: hero.text.available_balance,
		currency: core.text.currency
	});

	const currencies = Object.values(Currency);
	const groupName = $props.id();
	const languageRequests: Partial<Record<Languages, Promise<ReturnType<typeof getPreviewLabels>>>> =
		{};

	let chosenCurrency = $state<Currency>();
	let hoveredCurrency = $state<Currency>();
	let focusedCurrency = $state<Currency>();
	let loadedLabels = $state<ReturnType<typeof getPreviewLabels>>();

	const selectedCurrency = $derived(chosenCurrency ?? $currentCurrency);
	const displayedCurrency = $derived(hoveredCurrency ?? focusedCurrency ?? selectedCurrency);
	const pageLabels = $derived(getPreviewLabels($i18n));
	const language = $derived<Languages>(PREVIEW_LANGUAGES[displayedCurrency] ?? pageLabels.lang);
	const labels = $derived(
		loadedLabels !== undefined && loadedLabels.lang === language ? loadedLabels : pageLabels
	);

	const format = ({ currency, language }: { currency: Currency; language: Languages }): string =>
		new Intl.NumberFormat(language, {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(BALANCE_USD * SAMPLE_RATES[currency]);

	$effect(() => {
		const next = language;
		if (next === pageLabels.lang) {
			return;
		}

		const request = (languageRequests[next] ??= loadLanguage(next).then(getPreviewLabels));

		let current = true;
		void request.then((nextLabels) => {
			if (current) {
				loadedLabels = nextLabels;
			}
		});

		return () => {
			current = false;
		};
	});
</script>

<LandingPreviewFrame interactive label={$i18n.auth.landing.connect_preview}>
	<div class="@container flex min-w-0 flex-col gap-5 p-5 sm:p-7" lang={labels.lang}>
		<div class="flex items-center justify-between gap-3">
			<span class="text-sm text-tertiary">{labels.balance}</span>
			<span
				class="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary"
				lang={language}
			>
				{LANGUAGES[language]}
			</span>
		</div>

		<output class="flex min-h-12 items-center gap-3" aria-atomic="true">
			<LandingCurrencyFlag currency={displayedCurrency} size={36} />
			<span
				class="min-w-0 text-[clamp(1.25rem,7cqi,2.25rem)] font-bold tracking-tight [overflow-wrap:anywhere] text-primary tabular-nums"
				lang={language}
			>
				{format({ currency: displayedCurrency, language })}
			</span>
		</output>

		<fieldset class="m-0 min-w-0 border-0 p-0">
			<legend class="sr-only">{labels.currency}</legend>
			<div class="grid grid-cols-3 gap-2 @min-[28rem]:grid-cols-6">
				{#each currencies as currency (currency)}
					<label
						class="relative block min-w-0"
						onpointerenter={({ pointerType }) => {
							if (pointerType !== 'touch') {
								hoveredCurrency = currency;
							}
						}}
						onpointerleave={() => (hoveredCurrency = undefined)}
					>
						<input
							name={groupName}
							class="peer sr-only"
							checked={selectedCurrency === currency}
							onblur={() => (focusedCurrency = undefined)}
							onchange={() => (chosenCurrency = currency)}
							onfocus={() => {
								focusedCurrency = currency;
								hoveredCurrency = undefined;
							}}
							type="radio"
							value={currency}
						/>
						<span
							class="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-semibold transition-[color,background-color,scale] duration-150 press peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-(--color-background-brand-primary) motion-reduce:transition-none"
							class:bg-brand-subtle-20={currency === displayedCurrency}
							class:text-primary={currency === displayedCurrency}
							class:text-secondary={currency !== displayedCurrency}
						>
							<LandingCurrencyFlag {currency} size={18} />
							{currency.toUpperCase()}
						</span>
					</label>
				{/each}
			</div>
		</fieldset>
	</div>
</LandingPreviewFrame>

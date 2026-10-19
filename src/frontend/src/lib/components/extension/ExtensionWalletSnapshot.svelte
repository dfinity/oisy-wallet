<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ExtensionPanelSnapshot } from '$lib/types/extension';
	import { toExtensionPanelSnapshotCardData } from '$lib/utils/extension.utils';
	import { formatCurrency, formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		snapshot: ExtensionPanelSnapshot;
	}

	let { snapshot }: Props = $props();

	let total = $derived(
		formatCurrency({
			value: snapshot.usdTotal,
			currency: snapshot.currency,
			exchangeRate: {
				currency: snapshot.currency,
				exchangeRateToUsd: snapshot.exchangeRateToUsd,
				exchangeRate24hChangeMultiplier: null
			},
			language: $currentLanguage
		})
	);

	let updated = $derived.by(() => {
		const savedAt = new Date(snapshot.savedAt);
		const today = savedAt.toDateString() === new Date().toDateString();

		return formatSecondsToDate({
			seconds: Math.floor(snapshot.savedAt / 1000),
			language: $currentLanguage,
			...(today ? { formatOptions: {}, timeOnly: true } : {})
		});
	});

	let rows = $derived(snapshot.rows.map(toExtensionPanelSnapshotCardData));

	// The rows show their saved fiat values, but OISY's token cards wait for the first live prices
	// and for the exchange rate, and nothing loads either while signed out. Marking prices as loaded
	// and lending the saved rate lets the cards show what was saved.
	onMount(() => {
		exchangeStore.set([]);

		if (snapshot.currency !== $currentCurrency) {
			return;
		}

		currencyExchangeStore.setExchangeRateCurrency(snapshot.currency);
		currencyExchangeStore.setExchangeRate(snapshot.exchangeRateToUsd);
	});
</script>

<div class="flex w-full flex-col gap-6" data-tid="extension-wallet-snapshot">
	<!-- The look of OISY's hero card with all networks selected. The live card reads the signed-in session's stores, so it can't show a saved total. -->
	<section
		class="bg-pos-0 bg-size-200 flex w-full flex-col items-center justify-center gap-1 rounded-[24px] bg-brand-primary bg-linear-to-b from-default-0 to-default-100 p-3 pb-6 text-center text-primary-inverted"
	>
		<output class="mt-7 inline-block text-4xl font-bold break-all">
			{#if $isPrivacyMode}
				<IconDots styleClass="my-4.25" times={6} variant="lg" />
			{:else}
				{total}
			{/if}
		</output>

		<span class="text-xl font-medium text-brand-secondary-alt">
			{replacePlaceholders($i18n.extension.panel.last_updated, { $time: updated })}
		</span>
	</section>

	<div class="flex flex-col gap-3">
		<p class="m-0 text-center text-sm text-tertiary">{$i18n.extension.panel.sign_in_to_refresh}</p>

		<ButtonAuthenticateWithHelp asPopup fullWidth helpAlignment="center" needHelpLink={false} />
	</div>

	{#if rows.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-base font-bold">{$i18n.navigation.text.tokens}</h2>

			<div class="flex flex-col gap-3">
				{#each rows as data, index (`${data.symbol}:${index}`)}
					<div class="overflow-hidden rounded-xl">
						<TokenCard {data} showNetwork={false} />
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}

<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { EXCHANGE_DISABLED } from '$env/exchange.env';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ExtensionPanelSnapshot } from '$lib/types/extension';
	import {
		extensionPanelSnapshotHasLivePrices,
		extensionPanelSnapshotUsdTotal,
		toExtensionPanelSnapshotCardData
	} from '$lib/utils/extension.utils';
	import { formatCurrency, formatSecondsToDate } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		snapshot: ExtensionPanelSnapshot;
	}

	let { snapshot }: Props = $props();

	// Live prices once OISY's price worker has answered; until then, or without any, the saved ones.
	let livePrices = $derived(
		extensionPanelSnapshotHasLivePrices({ snapshot, prices: $exchangeStore })
	);

	// The live rate when the worker has fetched one for the saved currency, else the saved rate.
	let exchangeRate = $derived(
		$currencyExchangeStore.currency === snapshot.currency &&
			nonNullish($currencyExchangeStore.exchangeRateToUsd)
			? $currencyExchangeStore
			: {
					currency: snapshot.currency,
					exchangeRateToUsd: snapshot.exchangeRateToUsd,
					exchangeRate24hChangeMultiplier: null
				}
	);

	let total = $derived(
		formatCurrency({
			value: extensionPanelSnapshotUsdTotal({ snapshot, prices: $exchangeStore }),
			currency: snapshot.currency,
			exchangeRate,
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

	let rows = $derived(
		snapshot.rows.map((row) => toExtensionPanelSnapshotCardData({ row, prices: $exchangeStore }))
	);

	let worker: ExchangeWorker | undefined;
	let destroyed = false;

	// OISY's own price worker, on the public sources: OISY's backend prices need a session.
	const startLivePrices = async () => {
		const priced = (snapshot.holdings ?? []).some(({ priceKey }) => nonNullish(priceKey));

		if (EXCHANGE_DISABLED || !priced) {
			return;
		}

		const started = await ExchangeWorker.init();

		if (destroyed) {
			started.destroy();
			return;
		}

		worker = started;
		worker.startExchangeTimer({
			currentCurrency: snapshot.currency,
			erc20Addresses: snapshot.prices?.erc20Addresses ?? [],
			icrcCanisterIds: snapshot.prices?.icrcCanisterIds ?? [],
			splAddresses: snapshot.prices?.splAddresses ?? [],
			// Vault prices need an on-chain read with OISY's provider URLs, which the snapshot doesn't
			// keep; vaults stay at their saved value.
			erc4626TokensExchangeData: [],
			backendExchangeEnabled: false
		});
	};

	onDestroy(() => {
		destroyed = true;
		worker?.destroy();
	});

	// OISY's token cards wait for the first prices and for the exchange rate before showing fiat
	// values. Marking prices as loaded and lending the saved rate lets them show the saved values
	// until the live ones arrive.
	onMount(() => {
		exchangeStore.set([]);

		if (snapshot.currency === $currentCurrency) {
			currencyExchangeStore.setExchangeRateCurrency(snapshot.currency);
			currencyExchangeStore.setExchangeRate(snapshot.exchangeRateToUsd);
		}

		void startLivePrices();
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
			{replacePlaceholders(
				livePrices
					? $i18n.extension.panel.snapshot_prices_live
					: $i18n.extension.panel.snapshot_as_of,
				{ $time: updated }
			)}
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

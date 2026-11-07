<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import { EXCHANGE_DISABLED } from '$env/exchange.env';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ExtensionWalletTotal from '$lib/components/extension/ExtensionWalletTotal.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { signIn } from '$lib/services/auth.services';
	import { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { authLocked } from '$lib/stores/locked.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { InternetIdentityDomain } from '$lib/types/auth';
	import type { ExtensionPanelSnapshot } from '$lib/types/extension';
	import {
		extensionPanelSnapshotHasLivePrices,
		extensionPanelSnapshotUsdTotal,
		toExtensionPanelSnapshotCardData
	} from '$lib/utils/extension.utils';
	import { formatSecondsToDate } from '$lib/utils/format.utils';
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

	let usdTotal = $derived(extensionPanelSnapshotUsdTotal({ snapshot, prices: $exchangeStore }));

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

	const modalId = Symbol();

	// The same sign-in as OISY's, in a popup, offered as a small link: the panel shows the wallet
	// either way.
	const signInAgain = async () => {
		const { success } = await signIn({ domain: InternetIdentityDomain.VERSION_2_0, asPopup: true });

		if (success === 'ok') {
			authLocked.unlock({ source: 'login from extension panel' });
		} else {
			modalStore.openAuthHelp({ id: modalId, data: false });
		}
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
	<ExtensionWalletTotal
		currency={snapshot.currency}
		{exchangeRate}
		label={replacePlaceholders(
			livePrices
				? $i18n.extension.panel.snapshot_prices_live
				: $i18n.extension.panel.snapshot_as_of,
			{ $time: updated }
		)}
		{usdTotal}
	/>

	{#if rows.length > 0}
		<section class="flex flex-col gap-2">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-base font-bold">{$i18n.navigation.text.tokens}</h2>

				<ExternalLink
					ariaLabel={$i18n.extension.panel.all_tokens}
					href={`${page.url.origin}${AppPath.Tokens}`}
					iconAsLast
					iconSize="16"
					styleClass="text-sm"
				>
					{$i18n.extension.panel.view_all}
				</ExternalLink>
			</div>

			<div class="flex flex-col gap-3">
				{#each rows as data, index (`${data.symbol}:${index}`)}
					<div class="overflow-hidden rounded-xl">
						<TokenCard {data} showNetwork={false} />
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Where the recent activity is when signed in: it isn't saved, so it needs a sign-in. -->
	<p class="m-0 flex flex-wrap items-baseline gap-x-1 text-sm text-secondary">
		{$i18n.extension.panel.sign_in_for_activity}
		<Button inlineLink link onclick={signInAgain} styleClass="text-sm" type="button">
			{$i18n.extension.panel.sign_in}
		</Button>
	</p>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}

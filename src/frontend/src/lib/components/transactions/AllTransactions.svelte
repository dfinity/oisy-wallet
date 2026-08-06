<script lang="ts">
	import type { DismissedNotification } from '$declarations/backend/backend.did';
	import { tokensWithUnavailableIndexCanister } from '$icp/derived/ic-transactions-status.derived';
	import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { hasNoIndexCanister } from '$icp/validation/ic-token.validation';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import AllTransactionsList from '$lib/components/transactions/AllTransactionsList.svelte';
	import HiddenMicroTransactionsInfoBox from '$lib/components/transactions/HiddenMicroTransactionsInfoBox.svelte';
	import TransactionsFilterMobileButton from '$lib/components/transactions/filter/TransactionsFilterMobileButton.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import PageTitle from '$lib/components/ui/PageTitle.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import {
		hiddenMicroTransactionsBannerVisible,
		userDismissedNotifications,
		userProfileVersion
	} from '$lib/derived/user-profile.derived';
	import { dismissNotifications } from '$lib/services/notification.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token-ui';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		hiddenInfoQualifiers,
		saveHideInfoQualifiers,
		type HideInfoKey
	} from '$lib/utils/info.utils';
	import {
		filterUndismissedNotificationQualifiers,
		isSimpleNotificationDismissed
	} from '$lib/utils/notification.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	const UNAVAILABLE_INDEX_CANISTER_HIDE_KEY: HideInfoKey =
		'oisy_ic_hide_transaction_unavailable_canister';

	// The backend call is an update call that takes some time to complete.
	// If the user profile is reactively refreshed before the call completes, the store would
	// temporarily lose the dismissal, causing the banner to flicker back into view.
	// To prevent this, we keep an optimistic local copy, merged with the store.
	let temporaryDismissedNotifications = $state<DismissedNotification[]>([]);

	let allDismissedNotifications = $derived([
		...$userDismissedNotifications,
		...temporaryDismissedNotifications
	]);

	let btcBannerDismissed = $derived(
		isSimpleNotificationDismissed({
			kind: 'BtcActivityInfo',
			dismissedNotifications: allDismissedNotifications
		})
	);

	const dismissBtcBanner = () => {
		const notifications: DismissedNotification[] = [
			{
				Simple: {
					kind: { BtcActivityInfo: null },
					version: NOTIFICATION_VERSIONS.BtcActivityInfo
				}
			}
		];

		temporaryDismissedNotifications = [...temporaryDismissedNotifications, ...notifications];

		dismissNotifications({
			notifications,
			identity: $authIdentity,
			currentUserVersion: $userProfileVersion
		});
	};

	// A nullified entry means the wallet syncs the balance only, because the token has no Index
	// canister at all. A token whose Index canister is merely failing keeps its transactions and is
	// surfaced by tokensWithUnavailableIndexCanister once the failures pile up.
	// TODO: use a unique token identifier (e.g. token ID + network) instead of the display symbol to avoid collisions if two tokens share the same symbol
	let tokensWithoutCanister = $derived(
		$enabledFungibleNetworkTokens
			.filter((token) => $icTransactionsStore?.[token.id] === null)
			.map((token: TokenUi) => token as IcToken)
			.filter(hasNoIndexCanister)
			.map(getTokenDisplaySymbol)
	);

	let failingIndexCanisters = $derived(
		$tokensWithUnavailableIndexCanister.map(getTokenDisplaySymbol)
	);

	// Which tokens the user has already acknowledged. Per token, not one flag for the whole box:
	// dismissing it for one token must not silence a different token failing later.
	let dismissedUnavailableCanister = $state<string[]>(
		hiddenInfoQualifiers(UNAVAILABLE_INDEX_CANISTER_HIDE_KEY)
	);

	const rememberDismissed = (qualifiers: string[]) => {
		dismissedUnavailableCanister = qualifiers;

		saveHideInfoQualifiers({ key: UNAVAILABLE_INDEX_CANISTER_HIDE_KEY, qualifiers });
	};

	// A dismissal covers one outage, not the session: once a token's Index canister answers again it
	// is forgotten, so if it fails again later the user is told about it again.
	$effect(() => {
		const stillFailing = dismissedUnavailableCanister.filter((symbol) =>
			failingIndexCanisters.includes(symbol)
		);

		if (stillFailing.length !== dismissedUnavailableCanister.length) {
			rememberDismissed(stillFailing);
		}
	});

	let tokensWithUnavailableCanister = $derived(
		failingIndexCanisters.filter((symbol) => !dismissedUnavailableCanister.includes(symbol))
	);

	const dismissUnavailableCanisterWarning = () =>
		rememberDismissed([
			...dismissedUnavailableCanister,
			...tokensWithUnavailableCanister.filter(
				(symbol) => !dismissedUnavailableCanister.includes(symbol)
			)
		]);

	let undismissedNoCanister = $derived(
		filterUndismissedNotificationQualifiers({
			kind: 'NoIndexCanister',
			qualifiers: tokensWithoutCanister,
			dismissedNotifications: allDismissedNotifications
		})
	);

	const dismissNoCanisterWarning = () => {
		if (undismissedNoCanister.length > 0) {
			const notifications: DismissedNotification[] = undismissedNoCanister.map((symbol) => ({
				Qualified: {
					kind: { NoIndexCanister: null },
					qualifier: symbol,
					version: NOTIFICATION_VERSIONS.NoIndexCanister
				}
			}));

			temporaryDismissedNotifications = [...temporaryDismissedNotifications, ...notifications];

			dismissNotifications({
				notifications,
				identity: $authIdentity,
				currentUserVersion: $userProfileVersion
			});
		}
	};

	let hasBanners = $derived(
		undismissedNoCanister.length > 0 ||
			tokensWithUnavailableCanister.length > 0 ||
			!btcBannerDismissed ||
			$hiddenMicroTransactionsBannerVisible
	);
</script>

<div class="flex flex-col gap-5">
	<div class="flex items-center justify-between gap-2">
		{#if !$isPrivacyMode}
			<PageTitle>{$i18n.activity.text.title}</PageTitle>
		{:else}
			<div class="flex items-center gap-2">
				<PageTitle>{$i18n.activity.text.title}</PageTitle>
				<span class="text-tertiary">
					<IconEyeOff />
				</span>
			</div>
		{/if}

		<Responsive down="sm">
			<TransactionsFilterMobileButton />
		</Responsive>
	</div>

	{#if hasBanners}
		<div class="flex flex-col">
			{#if undismissedNoCanister.length > 0}
				<MessageBox level="warning" onDismiss={dismissNoCanisterWarning}>
					{replacePlaceholders($i18n.activity.warning.no_index_canister, {
						$token_list: undismissedNoCanister.map((s) => `$${s}`).join(', ')
					})}
				</MessageBox>
			{/if}

			{#if tokensWithUnavailableCanister.length > 0}
				<MessageBox level="warning" onDismiss={dismissUnavailableCanisterWarning}>
					{replacePlaceholders($i18n.activity.warning.unavailable_index_canister, {
						$token_list: tokensWithUnavailableCanister.map((s) => `$${s}`).join(', ')
					})}
				</MessageBox>
			{/if}

			{#if !btcBannerDismissed}
				<MessageBox level="plain" onDismiss={dismissBtcBanner}>
					{$i18n.activity.info.btc_transactions}
				</MessageBox>
			{/if}

			<HiddenMicroTransactionsInfoBox />
		</div>
	{/if}

	<AllTransactionsList />
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { DismissedNotification } from '$declarations/backend/backend.did';
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
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';
	import { dismissNotifications } from '$lib/services/notification.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token-ui';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		filterUndismissedNotificationQualifiers,
		isSimpleNotificationDismissed
	} from '$lib/utils/notification.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

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

	let enabledTokensWithoutTransaction = $derived(
		$enabledFungibleNetworkTokens
			.filter((token) => $icTransactionsStore?.[token.id] === null)
			.map((token: TokenUi) => token as IcToken)
	);

	let { tokensWithoutCanister, tokensWithUnavailableCanister } = $derived(
		enabledTokensWithoutTransaction.reduce<{
			tokensWithoutCanister: string[];
			tokensWithUnavailableCanister: string[];
		}>(
			(acc, curr) => {
				// TODO: use a unique token identifier (e.g. token ID + network) instead of the display symbol to avoid collisions if two tokens share the same symbol
				const symbol = getTokenDisplaySymbol(curr);

				if (hasNoIndexCanister(curr)) {
					acc.tokensWithoutCanister.push(symbol);
				} else {
					acc.tokensWithUnavailableCanister.push(symbol);
				}
				return acc;
			},
			{ tokensWithoutCanister: [], tokensWithUnavailableCanister: [] }
		)
	);

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

	onMount(() => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.ACTIVITY,
				event_value: PLAUSIBLE_EVENT_VALUES.ACTIVITY_PAGE
			}
		});
	});
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
				<MessageBox closableKey="oisy_ic_hide_transaction_unavailable_canister" level="warning">
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

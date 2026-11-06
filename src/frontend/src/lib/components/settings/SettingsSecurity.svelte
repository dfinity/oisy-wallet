<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { updateUserTransactionFilterSettings } from '$lib/api/backend.api';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL } from '$lib/constants/oisy.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { hideMicroTransactions, userProfileVersion } from '$lib/derived/user-profile.derived';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';
	import { toastsShow } from '$lib/stores/toasts.store';
	import { emit } from '$lib/utils/events.utils';

	let filterLoading = $state(false);

	const toggleMicroTransactions = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		filterLoading = true;

		try {
			await updateUserTransactionFilterSettings({
				identity: $authIdentity,
				hideMicroTransactions: !$hideMicroTransactions,
				currentUserVersion: $userProfileVersion
			});

			// Reset the local override so the `HiddenMicroTransactionsInfoBox` reappears after the
			// user switches the feature. The backend keeps the dismissed notification,
			// but this flag overrides it until the user dismisses the info box again.
			hiddenMicroTransactionsResetStore.set({
				key: 'hidden-micro-transactions-reset',
				value: { enabled: true }
			});

			emit({ message: 'oisyRefreshUserProfile' });

			toastsShow({
				text: $i18n.settings.text.save_spam_filter_success,
				level: 'success',
				duration: 2000
			});
		} finally {
			filterLoading = false;
		}
	};
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.security}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			{$i18n.settings.text.hide_micro_transactions}
		{/snippet}

		{#snippet value()}
			<Toggle
				ariaLabel={$hideMicroTransactions
					? $i18n.settings.text.disable_hide_micro_transactions
					: $i18n.settings.text.enable_hide_micro_transactions}
				checked={$hideMicroTransactions}
				disabled={filterLoading}
				onToggle={toggleMicroTransactions}
			/>
		{/snippet}

		{#snippet info()}
			<span>
				{$i18n.settings.text.hide_micro_transactions_description}

				<ExternalLink
					ariaLabel={$i18n.settings.text.learn_more}
					href={OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL}
					iconVisible={false}
					trackEvent={buildLearnMoreEvent({
						sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
						sourceSublocation: 'hide_micro_transactions',
						labelKey: 'settings.text.learn_more',
						url: OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL
					})}>{$i18n.settings.text.learn_more}</ExternalLink
				>
			</span>
		{/snippet}
	</SettingsCardItem>
</SettingsCard>

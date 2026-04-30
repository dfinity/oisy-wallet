<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import type { DismissedNotification } from '$declarations/backend/backend.did';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		hiddenMicroTransactionsBannerVisible,
		userProfileVersion
	} from '$lib/derived/user-profile.derived';
	import { dismissNotifications } from '$lib/services/notification.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';

	// Optimistic local dismissal: the backend dismiss call is an update call that takes
	// some time to complete. Keep an instant local override so the box hides immediately
	// when the user clicks dismiss; it is cleared once the global signal turns off.
	let locallyDismissed = $state(false);

	$effect(() => {
		if (!$hiddenMicroTransactionsBannerVisible) {
			locallyDismissed = false;
		}
	});

	let visible = $derived($hiddenMicroTransactionsBannerVisible && !locallyDismissed);

	const dismiss = () => {
		locallyDismissed = true;

		hiddenMicroTransactionsResetStore.set({
			key: 'hidden-micro-transactions-reset',
			value: { enabled: false }
		});

		const notifications: DismissedNotification[] = [
			{
				Simple: {
					kind: { HiddenMicroTransactions: null },
					version: NOTIFICATION_VERSIONS.HiddenMicroTransactions
				}
			}
		];

		dismissNotifications({
			notifications,
			identity: $authIdentity,
			currentUserVersion: $userProfileVersion
		});
	};
</script>

{#if visible}
	<MessageBox level="plain" onDismiss={dismiss}>
		<Html text={$i18n.activity.info.hidden_micro_transactions} />
	</MessageBox>
{/if}

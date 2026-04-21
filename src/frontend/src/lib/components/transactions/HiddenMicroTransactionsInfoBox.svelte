<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import type { DismissedNotification } from '$declarations/backend/backend.did';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		hideMicroTransactions,
		userDismissedNotifications,
		userProfileVersion
	} from '$lib/derived/user-profile.derived';
	import { dismissNotifications } from '$lib/services/notification.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { hiddenMicroTransactionsResetStore } from '$lib/stores/settings.store';
	import { isSimpleNotificationDismissed } from '$lib/utils/notification.utils';

	let temporaryDismissedNotifications = $state<DismissedNotification[]>([]);

	let allDismissedNotifications = $derived([
		...$userDismissedNotifications,
		...temporaryDismissedNotifications
	]);

	let backendDismissed = $derived(
		isSimpleNotificationDismissed({
			kind: 'HiddenMicroTransactions',
			dismissedNotifications: allDismissedNotifications
		})
	);

	// When the user toggles the "hide micro transactions" feature, we re-show the
	// info box even if the backend still has the notification stored as dismissed. The override
	// is cleared as soon as the user dismisses the info box again.
	let dismissed = $derived(backendDismissed && !$hiddenMicroTransactionsResetStore.enabled);

	let visible = $derived($hideMicroTransactions && !dismissed);

	const dismiss = () => {
		const notifications: DismissedNotification[] = [
			{
				Simple: {
					kind: { HiddenMicroTransactions: null },
					version: NOTIFICATION_VERSIONS.HiddenMicroTransactions
				}
			}
		];

		temporaryDismissedNotifications = [...temporaryDismissedNotifications, ...notifications];

		hiddenMicroTransactionsResetStore.set({
			key: 'hidden-micro-transactions-reset',
			value: { enabled: false }
		});

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

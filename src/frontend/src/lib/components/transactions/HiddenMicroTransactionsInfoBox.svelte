<script lang="ts">
	import type { DismissedNotification } from '$declarations/backend/backend.did';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import Html from '$lib/components/ui/Html.svelte';
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
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

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

{#snippet shieldIcon()}
	<div class="min-w-5 py-0 text-success-primary sm:py-0.5">
		<IconShieldCheck size="20" />
	</div>
{/snippet}

{#if visible}
	<MessageBox icon={shieldIcon} level="plain" onDismiss={dismiss}>
		<strong>{`${replaceOisyPlaceholders($i18n.core.text.oisy_protects_you)} `}</strong><Html
			text={$i18n.activity.info.hidden_micro_transactions}
		/>
	</MessageBox>
{/if}

<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { goto } from '$app/navigation';
	import { setUserShowTestnets } from '$lib/api/backend.api';
	import { NETWORK_PARAM } from '$lib/constants/routes.constants';
	import { TESTNET_TOGGLE } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { testnets } from '$lib/derived/testnets.derived';
	import { userProfileVersion } from '$lib/derived/user-profile.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { testnetsStore } from '$lib/stores/settings.store';
	import { emit } from '$lib/utils/events.utils';

	// TODO: create tests for this component once we have testId from GIX-CMP
	// PR: https://github.com/dfinity/gix-components/pull/531

	let checked: boolean;
	$: checked = $testnets;

	const toggleShowTestnets = async () => {
		try {
			await setUserShowTestnets({
				showTestnets: checked,
				identity: $authIdentity,
				currentUserVersion: $userProfileVersion
			});
		} catch (e: unknown) {
			// We ignore any errors here since we do not care, but we want to emit the message to refresh the user profile anyway
			console.error(e);
		}

		emit({ message: 'oisyRefreshUserProfile' });
	};

	const toggleTestnets = async () => {
		checked = !checked;

		// Do not wait for the backend to update the user profile since it can lead to unnecessary delays
		toggleShowTestnets();

		testnetsStore.set({ key: 'testnets', value: { enabled: !checked } });

		// Reset network param, since the network is selectable only when testnets are enabled
		if (checked) {
			const href = window.location.href;

			if (URL.canParse(href)) {
				const url = new URL(href);
				url.searchParams.delete(NETWORK_PARAM);
				await goto(url, { replaceState: true, noScroll: true });
			}
		}
	};
</script>

<Toggle
	testId={TESTNET_TOGGLE}
	ariaLabel={$i18n.settings.alt.testnets_toggle}
	bind:checked
	on:nnsToggle={toggleTestnets}
/>

<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { get } from 'svelte/store';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userProfileLoaded } from '$lib/derived/user-profile.derived';
	import { infoSignOut } from '$lib/services/auth.services';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const load = async ({ reload = false }: { reload?: boolean }) => {
		if (isNullish($authIdentity)) {
			userProfileStore.reset();
			return;
		}

		// `LoaderUserProfile` gates the rest of the loader tree behind
		// `$userProfileLoaded`. When the backend rejects new profile creation
		// (signups closed), `loadUserProfile` returns `signups-closed` without
		// populating the store, so the gate would never open and the user
		// would stay stuck on the skeleton without being signed out. We
		// therefore have to handle the sign-out here, instead of relying on
		// `initLoader` (which lives below the gate).
		const { success, err } = await loadUserProfile({ identity: $authIdentity, reload });

		if (!success && err === 'signups-closed') {
			await infoSignOut({
				text: ($i18n).auth.info.signups_closed,
				source: 'signups-closed'
			});
		}
	};

	$effect(() => {
		[$authIdentity];
		load({});
	});

	const reload = () => {
		load({ reload: true });
	};
</script>

<svelte:window onoisyRefreshUserProfile={reload} />

{#if $userProfileLoaded}
	{@render children()}
{/if}

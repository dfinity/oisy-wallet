<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	const load = ({ reload = false }: { reload?: boolean }) => {
		if (isNullish($authIdentity)) {
			userProfileStore.reset();
			return;
		}

		loadUserProfile({ identity: $authIdentity, reload });
	};

	$: $authIdentity, load({});

	const reload = () => {
		load({ reload: true });
	};
</script>

<svelte:window on:oisyRefreshUserProfile={reload} />

<slot />

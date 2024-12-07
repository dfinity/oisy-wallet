<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { nullishSignOut } from '$lib/services/auth.services';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	const load = async ({ reload = false }: { reload?: boolean }) => {
		if (isNullish($authIdentity)) {
			userProfileStore.reset();
			await nullishSignOut();
			return;
		}

		await loadUserProfile({ identity: $authIdentity, reload });
	};

	$: $authIdentity, (async () => await load({}))();

	const reload =async () => {
		await load({ reload: true });
	};
</script>

<svelte:window on:oisyRefreshUserProfile={reload} />

<slot />

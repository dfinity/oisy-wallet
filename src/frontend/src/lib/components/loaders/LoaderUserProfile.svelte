<script lang="ts">
	import { onMount } from 'svelte';
	import { authIdentity, authNotSignedIn } from '$lib/derived/auth.derived';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	const load = ({ reload = false }: { reload?: boolean }) => {
		if ($authNotSignedIn) {
			userProfileStore.reset();
			return;
		}

		loadUserProfile({ identity: $authIdentity, reload });
	};

	onMount(() => {
		load({});
	});

	const reload = () => {
		load({ reload: true });
	};
</script>

<svelte:window on:oisyRefreshUserProfile={reload} />

<slot />

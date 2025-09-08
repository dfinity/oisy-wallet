<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { userProfileLoaded } from '$lib/derived/user-profile.derived';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import { userProfileStore } from '$lib/stores/user-profile.store';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const load = ({ reload = false }: { reload?: boolean }) => {
		if (isNullish($authIdentity)) {
			userProfileStore.reset();
			return;
		}

		loadUserProfile({ identity: $authIdentity, reload });
	};

	$effect(() => {
		[$authIdentity];
		load({});
	});

	const reload = () => {
		load({ reload: true });
	};
</script>

<svelte:window on:oisyRefreshUserProfile={reload} />

{#if $userProfileLoaded}
	{@render children()}
{/if}

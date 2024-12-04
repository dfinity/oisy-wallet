<script lang="ts">
	import { onMount } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadUserProfile } from '$lib/services/load-user-profile.services';
	import type { OptionIdentity } from '$lib/types/identity';

	let identity: OptionIdentity;
	$: identity = $authIdentity;

	onMount(() => {
		loadUserProfile({ identity });
	});

	const reload = () => {
		loadUserProfile({ identity, reload: true });
	};
</script>

<svelte:window on:oisyRefreshUserProfile={reload} />

<slot />

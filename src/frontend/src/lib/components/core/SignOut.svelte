<script lang="ts">
	import { signOut } from '$lib/services/auth.services';
	import { IconLogout } from '@dfinity/gix-components';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		await signOut();
	};
</script>

<button data-tid="logout" on:click={logout} class="text">
	<IconLogout />
	Logout
</button>

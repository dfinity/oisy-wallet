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

<button on:click={logout} class="text gap-2">
	<IconLogout />
	Logout
</button>

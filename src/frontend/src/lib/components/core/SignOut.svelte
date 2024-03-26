<script lang="ts">
	import { signOut } from '$lib/services/auth.services';
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		await signOut();
	};
</script>

<button on:click={logout} class="text gap-2">
	<IconLogout />
	{$i18n.core.logout}
</button>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { goto } from '$app/navigation';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		await goto(new URL(window.location.origin));
		dispatch('icLogoutTriggered');
		await signOut();
	};
</script>

<button on:click={logout} class="text gap-2" data-tid={LOGOUT_BUTTON}>
	<IconLogout />
	{$i18n.auth.text.logout}
</button>

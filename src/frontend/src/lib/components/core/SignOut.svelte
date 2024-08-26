<script lang="ts">
	import { signOut } from '$lib/services/auth.services';
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		await signOut();
	};
</script>

<button on:click={logout} class="text gap-2" data-tid={LOGOUT_BUTTON}>
	<IconLogout />
	{$i18n.auth.text.logout}
</button>

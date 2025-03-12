<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		dispatch('icLogoutTriggered');
		await signOut({ resetUrl: true });
	};
</script>

<button on:click={logout} class="nav-item nav-item-condensed" data-tid={LOGOUT_BUTTON}>
	<IconLogout />
	{$i18n.auth.text.logout}
</button>

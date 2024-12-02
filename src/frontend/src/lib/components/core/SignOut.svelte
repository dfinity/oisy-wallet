<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import { LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceHistory } from '$lib/utils/route.utils';

	const dispatch = createEventDispatcher();

	const logout = async () => {
		replaceHistory('/');
		dispatch('icLogoutTriggered');
		await signOut();
	};
</script>

<button on:click={logout} class="text gap-2" data-tid={LOGOUT_BUTTON}>
	<IconLogout />
	{$i18n.auth.text.logout}
</button>

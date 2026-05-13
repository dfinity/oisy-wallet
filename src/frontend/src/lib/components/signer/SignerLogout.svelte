<script lang="ts">
	import IconLogout from '$lib/components/icons/IconLogout.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { SIGNER_LOGOUT_BUTTON } from '$lib/constants/test-ids.constants';
	import { signOut } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';

	const handleLogout = async () => {
		await signOut({
			resetUrl: true,
			source: 'signer-page'
		});
	};
</script>

<Button
	ariaLabel={$i18n.auth.text.logout}
	colorStyle="tertiary"
	innerStyleClass="items-center justify-center"
	onclick={handleLogout}
	paddingSmall
	styleClass="rounded-lg py-2"
	testId={SIGNER_LOGOUT_BUTTON}
	type="button"
>
	{$i18n.auth.text.logout}
	<IconLogout />
</Button>

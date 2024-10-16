<script lang="ts">
	import IconLogin from '$lib/components/icons/lucide/IconLogin.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonIcon ariaLabel={$i18n.auth.text.authenticate} on:click={async () => await signIn({})}>
	<IconLogin slot="icon" />
	{$i18n.auth.text.authenticate}
</ButtonIcon>

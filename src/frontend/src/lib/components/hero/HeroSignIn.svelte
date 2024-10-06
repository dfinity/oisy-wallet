<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<ButtonAuthenticate on:click={async () => await signIn({})}>
	<Html text={$i18n.auth.text.authenticate} />
</ButtonAuthenticate>

<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let disabled = true;
	$: disabled = $erc20UserTokensNotInitialized || $authNotSignedIn;
</script>

<button
	class="secondary center mx-auto mb-4 mt-12 w-full sm:w-auto"
	on:click={modalStore.openManageTokens}
	{disabled}
>
	<IconSettings />
	{$i18n.tokens.manage.text.your_tokens}
</button>

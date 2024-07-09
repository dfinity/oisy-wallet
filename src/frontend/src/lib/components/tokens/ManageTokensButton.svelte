<script lang="ts">
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import { authNotSignedIn } from '$lib/derived/auth.derived';

	let disabled = true;
	$: disabled = $erc20UserTokensNotInitialized || $authNotSignedIn;
</script>

<button
	class="  mx-auto mt-12 mb-4 font-bold"
	class:text-grey={disabled}
	class:text-blue={!disabled}
	class:hover:text-dark-blue={!disabled}
	class:active:text-dark-blue={!disabled}
	on:click={modalStore.openManageTokens}
	{disabled}
>
	<IconSettings />
	{$i18n.tokens.manage.text.your_tokens}
</button>

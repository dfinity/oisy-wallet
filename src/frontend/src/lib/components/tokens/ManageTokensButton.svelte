<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import { MANAGE_TOKENS_BUTTON } from '$lib/constants/test-ids.constants';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let disabled = true;
	$: disabled = $erc20UserTokensNotInitialized || $authNotSignedIn;
</script>

<button
	data-tid={MANAGE_TOKENS_BUTTON}
	class="tertiary"
	on:click={modalStore.openManageTokens}
	{disabled}
>
	<IconManage />
	{$i18n.tokens.manage.text.manage_list}
</button>

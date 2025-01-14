<script lang="ts">
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import IconManage from '$lib/components/icons/lucide/IconManage.svelte';
	import { NAVIGATION_ITEM_MANAGE_LIST } from '$lib/constants/test-ids.constants';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let disabled = true;
	$: disabled = $erc20UserTokensNotInitialized || $authNotSignedIn;
</script>

<button
	class="tertiary"
	data-tid={NAVIGATION_ITEM_MANAGE_LIST}
	on:click={modalStore.openManageTokens}
	{disabled}
>
	<IconManage />
	{$i18n.tokens.manage.text.manage_list}
</button>

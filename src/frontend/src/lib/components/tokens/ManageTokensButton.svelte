<script lang="ts">
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	let disabled = true;
	$: disabled = $authNotSignedIn;
</script>

<button
	class="text-primary w-full justify-end font-bold no-underline"
	on:click={modalStore.openManageTokens}
	{disabled}
>
	<IconSettings />
	{$i18n.tokens.manage.text.your_tokens}
</button>

{#if $modalManageTokens}
	<ManageTokensModal />
{/if}

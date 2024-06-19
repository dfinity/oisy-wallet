<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
</script>

<div class="content">
	<ButtonMenu ariaLabel={$i18n.tokens.manage.text.title} on:click={modalStore.openManageTokens}>
		{$i18n.tokens.manage.text.title}
	</ButtonMenu>
</div>

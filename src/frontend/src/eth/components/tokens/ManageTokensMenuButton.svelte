<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
</script>

<div class="content">
	<ButtonMenu
		label={`+ ${$i18n.tokens.import.text.title}`}
		ariaLabel={$i18n.tokens.import.text.title}
		on:click={modalStore.openAddToken}
	/>
</div>

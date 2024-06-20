<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const onClick = () => {
		modalStore.openAddToken();
		dispatch('icCloseMenu');
	};
</script>

<div class="content">
	<ButtonMenu ariaLabel={$i18n.tokens.import.text.title} on:click={onClick}>
		{`+ ${$i18n.tokens.import.text.title}`}
	</ButtonMenu>
</div>

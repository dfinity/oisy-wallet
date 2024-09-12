<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ButtonMenu from '$lib/components/ui/ButtonMenu.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const dispatch = createEventDispatcher();

	const onClick = () => {
		modalStore.openManageTokens();
		dispatch('icCloseMenu');
	};
</script>

<div class="content">
	<ButtonMenu ariaLabel={$i18n.tokens.manage.text.title} on:click={onClick}>
		{$i18n.tokens.manage.text.title}
	</ButtonMenu>
</div>

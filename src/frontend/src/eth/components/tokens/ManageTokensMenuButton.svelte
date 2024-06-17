<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<div class="content">
	<button
		class="flex gap-2 items-center no-underline hover:text-blue active:text-blue"
		aria-label={$i18n.tokens.import.text.title}
		on:click={modalStore.openAddToken}
	>
		{`+ ${$i18n.tokens.import.text.title}`}
	</button>
</div>

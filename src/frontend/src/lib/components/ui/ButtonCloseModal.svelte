<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
</script>

<Button paddingSmall colorStyle="secondary" type="button" fullWidth on:click={modalStore.close}>
	{$i18n.core.text.close}
</Button>

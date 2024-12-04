<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { ButtonColorStyle } from '$lib/types/style';

	export let colorStyle: ButtonColorStyle = 'secondary';
</script>

<Button paddingSmall {colorStyle} type="button" fullWidth on:click={modalStore.close}>
	{$i18n.core.text.close}
</Button>

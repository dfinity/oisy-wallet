<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		isPrimary?: boolean;
	}

	let { isPrimary = false }: Props = $props();
</script>

<Button
	paddingSmall
	colorStyle={isPrimary ? 'primary' : 'secondary-light'}
	type="button"
	fullWidth
	onclick={modalStore.close}
>
	{$i18n.core.text.close}
</Button>

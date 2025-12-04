<script lang="ts">
	import { goto } from '$app/navigation';
	import { i18n } from '$lib/stores/i18n.store';
	import IconOisyMate from '$lib/components/icons/IconOisyMate.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<div class="mb-12 flex flex-col items-center justify-center gap-4 text-center">
	<IconOisyMate />
	<h3>{$i18n.scanner.text.no_supported_tokens}</h3>
	<p>{$i18n.scanner.text.supported_tokens} </p>
	<Button colorStyle="secondary-light" onclick={() => goto('/')}
		>{$i18n.scanner.text.go_to_assets}</Button
	>
</div>

<script lang="ts">
	import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
	import MenuControlRow from '$lib/components/core/MenuControlRow.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MenuControlRow label={$i18n.core.text.language}>
	{#snippet icon()}<IconWorld size="20" />{/snippet}

	<LanguageDropdown />
</MenuControlRow>

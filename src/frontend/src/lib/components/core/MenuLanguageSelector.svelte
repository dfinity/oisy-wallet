<script lang="ts">
	import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
	import IconLanguage from '$lib/components/icons/IconLanguage.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex justify-between pl-3">
	<span class="mr-3 flex min-w-32 items-center text-tertiary">
		<span class="mr-1 flex"><IconLanguage /></span>
		<span class="flex">{$i18n.core.text.language}</span>
	</span>

	<LanguageDropdown />
</div>

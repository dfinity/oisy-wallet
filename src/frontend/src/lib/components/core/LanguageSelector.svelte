<script lang="ts">
	import IconLanguage from '$lib/components/icons/IconLanguage.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { SUPPORTED_LANGUAGES } from '$env/i18n';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { Languages } from '$lib/types/languages';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import List from '$lib/components/common/List.svelte';

	const handleLangChange = (lang: string) => {
		i18n.switchLang(Languages[lang as keyof typeof Languages]);
	};
</script>

<div class="flex flex-row justify-between pl-3">
	<span class="flex flex-row items-center text-tertiary">
		<span class="mr-1 flex"><IconLanguage /></span>
		<span class="flex">Language</span>
	</span>

	<Dropdown ariaLabel="Swtch lang">
		{$i18n.lang}

		{#snippet items()}
			<List noPadding condensed>
				{#each SUPPORTED_LANGUAGES as lang}
					<ListItem
						><Button
							colorStyle="secondary-light"
							paddingSmall
							transparent
							onclick={() => handleLangChange(lang)}>{lang}</Button
						></ListItem
					>
				{/each}
			</List>
		{/snippet}
	</Dropdown>
</div>

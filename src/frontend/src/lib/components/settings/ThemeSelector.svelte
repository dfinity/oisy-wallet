<script lang="ts">
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { THEME_VALUES } from '$lib/constants/app.constants';
	import { selectedTheme } from '$lib/derived/settings.derived';
	import { Themes } from '$lib/enums/themes';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/settings.store';
	const selectTheme = (name: Themes) => {
		themeStore.set({ key: 'theme', value: { name } });
	};
</script>

<div class="flex flex-row">
	{#each THEME_VALUES as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={$selectedTheme === theme}
			on:click={() => selectTheme(theme)}
			on:keydown={() => selectTheme(theme)}
			tabindex={THEME_VALUES.indexOf(theme)}
		>
			{#await import(`$lib/assets/${theme}-theme.png`) then { default: src }}
				<Img {src} alt={$i18n.settings.alt[`appearance_${theme}`]} />
			{/await}
		</ThemeSelectorCard>
	{/each}
</div>

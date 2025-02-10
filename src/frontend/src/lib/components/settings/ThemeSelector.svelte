<script lang="ts">
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	// TODO: replace with @dfinity/gix-components Theme.Light and Theme.Dark
	enum Themes {
		LIGHT = 'light',
		DARK = 'dark',
		SYSTEM = 'system'
	}

	const THEME_VALUES = Object.values(Themes);

	// TODO: rename _name with theme
	const selectTheme = (_name: Themes) => {
		// TODO: use themeStore from @dfinity/gix-components
		// themeStore.set({ key: 'theme', value: { name } });
	};

	// TODO: implement selected using $themeStore from @dfinity/gix-components
	// selected={$selectedTheme === theme}
</script>

<div class="flex flex-row">
	{#each THEME_VALUES as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={false}
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

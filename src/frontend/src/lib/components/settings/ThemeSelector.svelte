<script lang="ts">
	import { themeStore, Theme } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { THEME_SELECTOR_CARD } from '$lib/constants/test-ids.constants';
	import { THEME_KEY, THEME_VALUES } from '$lib/constants/themes.constants';
	import { SystemTheme } from '$lib/enums/themes';
	import { i18n } from '$lib/stores/i18n.store';

	const selectTheme = (theme: Theme | SystemTheme) => {
		if (theme === SystemTheme.SYSTEM) {
			themeStore.resetToSystemSettings();
			return;
		}

		themeStore.select(theme);
	};

	let selectedTheme: Theme | SystemTheme;
	$: selectedTheme = isNullish(localStorage.getItem(THEME_KEY))
		? SystemTheme.SYSTEM
		: ($themeStore ?? SystemTheme.SYSTEM);
</script>

<div class="flex flex-row">
	{#each THEME_VALUES as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={selectedTheme === theme}
			on:click={() => selectTheme(theme)}
			on:keydown={() => selectTheme(theme)}
			tabindex={THEME_VALUES.indexOf(theme)}
			testId={`${THEME_SELECTOR_CARD}-${theme}`}
		>
			{#await import(`$lib/assets/${theme}-theme.png`) then { default: src }}
				<Img {src} alt={$i18n.settings.alt[`appearance_${theme}`]} />
			{/await}
		</ThemeSelectorCard>
	{/each}
</div>

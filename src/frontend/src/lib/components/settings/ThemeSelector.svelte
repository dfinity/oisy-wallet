<script lang="ts">
	import { themeStore, Theme } from '@dfinity/gix-components';
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { THEME_SELECTOR_CARD } from '$lib/constants/test-ids.constants';
	import { THEME_VALUES } from '$lib/constants/themes.constants';
	import { SystemTheme } from '$lib/enums/themes';
	import { i18n } from '$lib/stores/i18n.store';

	const selectTheme = (theme: Theme | SystemTheme) => {
		// Since gix-components does not support System theme, a good solution is to delete the cached theme when the user selects the System theme.
		if (theme === SystemTheme.SYSTEM) {
			// TODO: use variable exposed from gix-components when it will be exposed.
			localStorage.removeItem('nnsTheme');
			return;
		}

		themeStore.select(theme);
	};
</script>

<div class="flex flex-row">
	{#each THEME_VALUES as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={($themeStore ?? SystemTheme.SYSTEM) === theme}
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

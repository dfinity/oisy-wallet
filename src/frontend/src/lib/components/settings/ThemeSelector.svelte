<script lang="ts">
	import { themeStore, Theme, type ThemeStoreData } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { THEME_SELECTOR_CARD } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	const THEME_VALUES = [...Object.values(Theme)];

	// TODO: use variable exposed from gix-components when it will be exposed.
	const THEME_KEY = 'nnsTheme';

	const THEME_SYSTEM = 'system';

	const selectTheme = (theme: Theme | typeof THEME_SYSTEM) => {
		// even though we call initSelectedTheme on store change, changing to system theme will not update the store so we manually update the selectedCard
		selectedCard = theme;

		if (theme === THEME_SYSTEM) {
			themeStore.resetToSystemSettings();
			return;
		}

		themeStore.select(theme);
	};

	let selectedCard: Theme | typeof THEME_SYSTEM;

	// Here we just update the local variable above to update the selected card
	const updateSelectedCard = (themeStore: ThemeStoreData) => {
		selectedCard = isNullish(localStorage.getItem(THEME_KEY))
			? THEME_SYSTEM
			: (themeStore ?? THEME_SYSTEM);
	};

	$: updateSelectedCard($themeStore);
</script>

<div class="flex flex-row">
	{#each THEME_VALUES as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={selectedCard === theme}
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

	<ThemeSelectorCard
		label={$i18n.settings.text.appearance_system}
		selected={selectedCard === THEME_SYSTEM}
		on:click={() => selectTheme(THEME_SYSTEM)}
		on:keydown={() => selectTheme(THEME_SYSTEM)}
		tabindex={THEME_VALUES.length}
		testId={`${THEME_SELECTOR_CARD}-${THEME_SYSTEM}`}
	>
		{#await import(`$lib/assets/${THEME_SYSTEM}-theme.png`) then { default: src }}
			<Img {src} alt={$i18n.settings.alt.appearance_system} />
		{/await}
	</ThemeSelectorCard>
</div>

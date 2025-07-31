<script lang="ts">
	import { Theme, themeStore, type ThemeStoreData } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import ThemeSelectorButton from '$lib/components/core/ThemeSelectorButton.svelte';
	import IconDuoTone from '$lib/components/icons/IconDuoTone.svelte';
	import IconMoon from '$lib/components/icons/IconMoon.svelte';
	import IconSun from '$lib/components/icons/IconSun.svelte';
	import IconSunMoon from '$lib/components/icons/IconSunMoon.svelte';
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

	let selectedCard: Theme | typeof THEME_SYSTEM = $state(THEME_SYSTEM);

	// Here we just update the local variable above to update the selected card
	const updateSelectedCard = (themeStore: ThemeStoreData) => {
		selectedCard = isNullish(localStorage.getItem(THEME_KEY))
			? THEME_SYSTEM
			: (themeStore ?? THEME_SYSTEM);
	};

	$effect(() => {
		updateSelectedCard($themeStore);
	});
</script>

<div class="flex justify-between pl-3">
	<span class="mr-3 flex min-w-32 items-center text-tertiary">
		<span class="mr-2 flex"><IconSunMoon /></span>
		<span class="flex">{$i18n.settings.text.appearance}</span>
	</span>

	<div class="flex">
		<ThemeSelectorButton
			label={$i18n.settings.text.appearance_system}
			onclick={() => selectTheme(THEME_SYSTEM)}
			selected={selectedCard === THEME_SYSTEM}
			testId={`${THEME_SELECTOR_CARD}-${THEME_SYSTEM}`}
		>
			<IconDuoTone size="20" />
		</ThemeSelectorButton>

		{#each THEME_VALUES as theme (theme)}
			<ThemeSelectorButton
				label={$i18n.settings.text[`appearance_${theme}`]}
				onclick={() => selectTheme(theme)}
				selected={selectedCard === theme}
				testId={`${THEME_SELECTOR_CARD}-${theme}`}
			>
				{#if theme === Theme.LIGHT}
					<IconSun size="20" />
				{/if}
				{#if theme === Theme.DARK}
					<IconMoon size="20" />
				{/if}
			</ThemeSelectorButton>
		{/each}
	</div>
</div>

<script lang="ts">
	import ThemeSelectorCard from '$lib/components/settings/ThemeSelectorCard.svelte';
	import { selectedTheme } from '$lib/derived/settings.derived';
	import { Themes } from '$lib/enums/themes';
	import { i18n } from '$lib/stores/i18n.store';
	import { themeStore } from '$lib/stores/settings.store';
	let checked: boolean;
	$: selected = $selectedTheme;
	const selectTheme = (name: Themes) => async () => {
		themeStore.set({ key: 'theme', value: { name } });
	};
</script>

<div class="flex flex-row">
	{#each Object.values(Themes) as theme}
		<ThemeSelectorCard
			label={$i18n.settings.text[`appearance_${theme}`]}
			selected={selected === theme}
			on:click={selectTheme(theme)}
			on:keydown={selectTheme(theme)}
			tabindex={-1}
		>
			{#await import(`$lib/assets/${theme}-theme.png`) then { default: src }}
				<img {src} alt={theme} />
			{/await}
		</ThemeSelectorCard>
	{/each}
</div>

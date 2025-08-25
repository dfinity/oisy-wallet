<script lang="ts">
	import { SUPPORTED_LANGUAGES, LANGUAGES } from '$env/i18n';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { LANGUAGE_DROPDOWN } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { Languages } from '$lib/enums/languages';
	import { i18n } from '$lib/stores/i18n.store';

	let dropdown = $state<Dropdown>();

	const currentLang: string = $derived(LANGUAGES[$currentLanguage]);

	const handleLangChange = (lang: string) => {
		i18n.switchLang(Languages[lang as keyof typeof Languages]);
		dropdown?.close();
	};
</script>

<span class="lang-selector min-w-32">
	<Dropdown
		bind:this={dropdown}
		ariaLabel={$i18n.core.alt.switch_language}
		asModalOnMobile
		buttonBorder
		buttonFullWidth
	>
		{currentLang}

		{#snippet title()}
			{$i18n.core.alt.switch_language}
		{/snippet}

		{#snippet items()}
			<List condensed noPadding testId={LANGUAGE_DROPDOWN}>
				{#each SUPPORTED_LANGUAGES as [langKey, langVal], index (index + langKey)}
					<ListItem>
						<Button
							alignLeft
							colorStyle="tertiary-alt"
							fullWidth
							onclick={() => handleLangChange(langKey)}
							paddingSmall
							styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
							transparent
						>
							<span class="pt-0.75 w-[20px] text-brand-primary">
								{#if $currentLanguage === langVal}
									<IconCheck size="20" />
								{/if}
							</span>
							{LANGUAGES[langVal]}
						</Button>
					</ListItem>
				{/each}
			</List>
		{/snippet}
	</Dropdown>
</span>

<style lang="scss">
	:global .lang-selector {
		button {
			font-weight: normal !important;
		}
		.wrapper {
			padding: var(--padding-1_25x) !important;
		}
	}
</style>

<script lang="ts">
	import IconLanguage from '$lib/components/icons/IconLanguage.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import { SUPPORTED_LANGUAGES } from '$env/i18n';
	import Button from '$lib/components/ui/Button.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { Languages } from '$lib/types/languages';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import List from '$lib/components/common/List.svelte';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';

	let dropdown: Dropdown | undefined;

	const handleLangChange = (lang: string) => {
		i18n.switchLang(Languages[lang as keyof typeof Languages]);
		dropdown?.close();
	};
</script>

<div class="lang-selector flex flex-row justify-between pl-3">
	<span class="mr-3 flex flex-row items-center text-tertiary">
		<span class="mr-1 flex"><IconLanguage /></span>
		<span class="flex">Language</span>
	</span>

	<span class="min-w-32">
		<Dropdown bind:this={dropdown} ariaLabel="Swtch lang" asModalOnMobile fullWidth border>
			{$i18n.languages[$i18n.lang]}

			{#snippet title()}
				Select Language
			{/snippet}

			{#snippet items()}
				<List noPadding condensed>
					{#each SUPPORTED_LANGUAGES as [langKey, langVal]}
						<ListItem>
							<Button
								onclick={() => handleLangChange(langKey)}
								fullWidth
								paddingSmall
								styleClass="py-1 rounded-md font-normal text-primary underline-none pl-0.5 min-w-28"
								colorStyle="tertiary-alt"
								transparent
							>
								<span class="pt-0.75 w-[20px] text-brand-primary">
									{#if $i18n.lang === langVal}
										<IconCheck size="20" />
									{/if}
								</span>
								{$i18n.languages[langVal]}
							</Button>
						</ListItem>
					{/each}
				</List>
			{/snippet}
		</Dropdown>
	</span>
</div>

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

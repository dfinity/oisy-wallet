<script lang="ts">
	import ButtonHero from '$lib/components/hero/ButtonHero.svelte';
	import IconRetry from '$lib/components/icons/IconRetry.svelte';
	import { NFT_HERO_CHECK_NEW_BUTTON } from '$lib/constants/test-ids.constants';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { emit } from '$lib/utils/events.utils';

	let loading = $state(false);

	const onClick = () => {
		loading = true;

		const callback = () => (loading = false);

		emit({
			message: 'oisyReloadCollections',
			detail: { callback }
		});
	};
</script>

<ButtonHero
	ariaLabel={$i18n.nfts.alt.check_new}
	disabled={$isBusy || loading}
	{loading}
	onclick={onClick}
	testId={NFT_HERO_CHECK_NEW_BUTTON}
>
	{#snippet icon()}
		<!-- Keep the 24px box the other hero icons reserve, so the smaller glyph stays
		     centred on the same spot and the label does not shift up. -->
		<span class="flex size-6 items-center justify-center">
			<IconRetry size="20" />
		</span>
	{/snippet}
	{#snippet label()}
		<span class="sm:hidden">{$i18n.nfts.text.check_new_short}</span>
		<span class="hidden sm:inline">{$i18n.nfts.text.check_new}</span>
	{/snippet}
</ButtonHero>

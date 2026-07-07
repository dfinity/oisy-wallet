<script lang="ts">
	import SkeletonCard from '$lib/components/ui/SkeletonCard.svelte';
	import { TRADING_LIST_SKELETON } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!--
	Shown while the first OISY TRADE load is in flight, so the Trading tab settles
	into My-assets or the onboarding placeholder instead of flashing the
	placeholder first. Mirrors the My-assets section layout with the shared
	`SkeletonCard` rows.
-->
<div class="flex flex-col gap-4" data-tid={TRADING_LIST_SKELETON}>
	<section class="flex flex-col gap-2">
		<h3 class="text-base font-bold text-primary">{$i18n.trading.assets.title}</h3>
		<SkeletonCard />
		<SkeletonCard />
	</section>
</div>

<script lang="ts">
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
</script>

<DelayedTooltip text={$i18n.nfts.text.hidden} delay={300}>
	<span class="flex items-center text-tertiary" data-tid={NFT_HIDDEN_BADGE}>
		<IconEyeOff size="24" />
	</span>
</DelayedTooltip>

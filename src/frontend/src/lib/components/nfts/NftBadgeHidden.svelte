<script lang="ts">
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants.js';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<DelayedTooltip delay={0} text={$i18n.nfts.text.hidden}>
	<span class="flex items-center text-tertiary" data-testid={NFT_HIDDEN_BADGE}>
		<IconEyeOff size="24" />
	</span>
</DelayedTooltip>

<script lang="ts">
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import { NFT_SPAM_BADGE } from '$lib/constants/test-ids.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
</script>

<DelayedTooltip text={$i18n.nfts.text.spam} delay={0}>
	<span class="flex items-center text-warning-primary" data-testid={NFT_SPAM_BADGE}>
		<IconAlertOctagon size="24" />
	</span>
</DelayedTooltip>

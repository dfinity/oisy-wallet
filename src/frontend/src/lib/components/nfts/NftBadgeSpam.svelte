<script lang="ts">
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import { NFT_SPAM_BADGE } from '$lib/constants/test-ids.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
</script>

<DelayedTooltip delay={300} text={$i18n.nfts.text.spam}>
	<span class="flex items-center text-warning-primary" data-tid={NFT_SPAM_BADGE}>
		<IconAlertOctagon size="24" />
	</span>
</DelayedTooltip>

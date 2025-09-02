<script lang="ts">
	import IconAlertOctagon from '$lib/components/icons/lucide/IconAlertOctagon.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { NFT_SPAM_BADGE } from '$lib/constants/test-ids.constants.js';
	import { i18n } from '$lib/stores/i18n.store.js';
</script>

<Badge styleClass="pl-1 pr-2" testId={NFT_SPAM_BADGE} variant="nft-spam" width="w-fit">
	<div class="py-0.25 flex items-center gap-1">
		<IconAlertOctagon size="16" />
		{$i18n.nfts.text.spam}
	</div>
</Badge>

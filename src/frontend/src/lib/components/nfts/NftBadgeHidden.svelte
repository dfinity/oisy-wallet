<script>
	import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants.js';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
</script>

<Badge
	styleClass="pl-1 pr-2"
	testId={NFT_HIDDEN_BADGE}
	variant="disabled"
	width="w-fit"
>
	<div class="flex items-center gap-1">
		<IconEyeOff size="18" />
		{$i18n.nfts.text.hidden}
	</div>
</Badge>
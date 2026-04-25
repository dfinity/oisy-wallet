<script lang="ts">
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_ICP_MEMO_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div
	class="mb-4 flex items-start gap-4 rounded-xl border border-disabled bg-white px-4 py-3 text-sm font-medium text-primary sm:text-base"
>
	<div class="min-w-5 py-0 text-brand-primary sm:py-0.5">
		<IconInfo />
	</div>
	<div>
		{$i18n.send.info.icp_memo_methods}
		<ExternalLink
			ariaLabel={$i18n.send.info.icp_memo_learn_more}
			color="blue"
			href={OISY_ICP_MEMO_DOCS_URL}
			iconVisible={false}
			styleClass="font-semibold"
		>
			{$i18n.send.info.icp_memo_learn_more}
		</ExternalLink>
	</div>
</div>

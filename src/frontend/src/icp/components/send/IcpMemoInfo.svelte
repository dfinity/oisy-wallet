<script lang="ts">
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_ICP_MEMO_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div
	class="memo-info mb-4 mt-6 flex items-start gap-4 rounded-xl px-4 py-3 text-sm font-medium text-primary sm:text-base"
>
	<div class="min-w-5 py-0 text-brand-primary sm:py-0.5">
		<IconInfo />
	</div>
	<div>
		{$i18n.send.info.icp_memo_methods}
		<ExternalLink
			ariaLabel={$i18n.core.alt.learn_more}
			href={OISY_ICP_MEMO_DOCS_URL}
			iconVisible={false}
			styleClass="font-semibold"
		>
			{$i18n.core.text.learn_more}
		</ExternalLink>
	</div>
</div>

<style lang="scss">
	.memo-info {
		background-color: var(--color-background-brand-light);
	}

	:global(html[theme='dark']) .memo-info {
		background-color: var(--color-background-primary);
	}
</style>

<script lang="ts">
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { OISY_ICP_MEMO_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<MessageBox level="plain" styleClass="mt-6">
	{$i18n.send.info.icp_memo_methods}
	<ExternalLink
		ariaLabel={$i18n.core.alt.learn_more}
		href={OISY_ICP_MEMO_DOCS_URL}
		iconVisible={false}
		styleClass="font-semibold"
	>
		{$i18n.core.text.learn_more}
	</ExternalLink>
</MessageBox>

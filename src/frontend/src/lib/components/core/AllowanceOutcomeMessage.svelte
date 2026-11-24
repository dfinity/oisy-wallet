<script lang="ts">
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		insufficientAllowanceMessage,
		type InsufficientAllowanceOutcome
	} from '$lib/utils/allowance.utils';

	interface Props {
		outcome: InsufficientAllowanceOutcome;
		styleClass?: string;
		testId?: string;
	}

	let { outcome, styleClass, testId }: Props = $props();
</script>

<MessageBox level={outcome === 'renewed' ? 'info' : 'warning'} {styleClass} {testId}>
	{insufficientAllowanceMessage({ outcome, i18n: $i18n })}
</MessageBox>

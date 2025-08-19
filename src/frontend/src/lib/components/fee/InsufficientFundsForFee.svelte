<script lang="ts">
	import { slide } from 'svelte/transition';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		testId?: string;
	}

	let { testId }: Props = $props();
</script>

<div data-tid={testId} transition:slide={SLIDE_DURATION}>
	<MessageBox level="error">{$i18n.fee.assertion.insufficient_funds_for_fee}</MessageBox>
</div>

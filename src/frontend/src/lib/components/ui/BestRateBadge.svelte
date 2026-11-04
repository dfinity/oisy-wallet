<script lang="ts">
	import IconStar from '$lib/components/icons/IconStar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Responsive from '$lib/components/ui/Responsive.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		styleClass?: string;
	}

	let { styleClass = 'mt-1' }: Props = $props();
</script>

<Badge {styleClass} variant="success" width="w-fit">
	<span class="flex items-center gap-1">
		<IconStar />
		<Responsive up="md">{$i18n.swap.text.best_rate}</Responsive>
		<!-- Phones show the star alone; the label still names it for screen readers. -->
		<Responsive down="sm"><span class="sr-only">{$i18n.swap.text.best_rate}</span></Responsive>
	</span>
</Badge>

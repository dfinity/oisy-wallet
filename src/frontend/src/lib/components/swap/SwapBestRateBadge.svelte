<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import IconStar from '../icons/IconStar.svelte';
	import Badge from '../ui/Badge.svelte';
	import Responsive from '../ui/Responsive.svelte';
</script>

<Badge variant="success" styleClass="mt-1" width="w-fit">
	<span class="flex items-center gap-1">
		<IconStar />
		<Responsive up="md">{$i18n.swap.text.best_rate}</Responsive>
	</span>
</Badge>

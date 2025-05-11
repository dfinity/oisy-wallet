<script lang="ts">
	import IconStar from '../icons/IconStar.svelte';
	import Badge from '../ui/Badge.svelte';
	import Responsive from '../ui/Responsive.svelte';
</script>

<Badge variant="success" styleClass="mt-1">
	<span class="flex items-center gap-1">
		<IconStar />
		<Responsive up="md">Best Rate</Responsive>
	</span>
</Badge>

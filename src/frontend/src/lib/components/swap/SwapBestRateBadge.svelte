<script lang="ts">
	import IconStar from '../icons/IconStar.svelte';
	import Badge from '../ui/Badge.svelte';
	import Responsive from '../ui/Responsive.svelte';
</script>

<div>
	<Badge styleClass="mt-1" variant="success">
		<IconStar />
		<Responsive up="md">Best Rate</Responsive>
	</Badge>
</div>

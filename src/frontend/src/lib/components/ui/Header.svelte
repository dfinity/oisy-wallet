<script lang="ts">
	import { onIntersectionNotCollapsed } from '$lib/directives/intersection.directives';
</script>

<div class="flex justify-between mb-6 pb-1 items-center" use:onIntersectionNotCollapsed>
	<h2 class="text-base"><slot /></h2>

	<slot name="end" />
</div>

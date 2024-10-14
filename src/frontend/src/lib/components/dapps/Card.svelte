<script lang="ts">
</script>

<div
	class="relative flex-1 rounded-3xl bg-white p-4 pt-12 transition-shadow hover:shadow {$$restProps.class ||
		''}"
>
	<div class="flex h-full flex-col justify-between gap-y-2">
		<slot name="content"></slot>
		<slot name="footer"></slot>
	</div>
</div>

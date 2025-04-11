<!--
	We need this boundary element to define how far out the SlidingInput can go.
-->
<div class="relative flex w-full">
	<div class="flex pr-12">
		<slot name="content" />
	</div>
	<slot name="input" />
</div>

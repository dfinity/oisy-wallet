<main class="relative mx-auto max-w-screen-2.5xl pt-6 md:flex md:w-full md:flex-row lg:w-auto">
	<div
		class="invisible absolute -translate-x-full transition-all duration-200 ease-in-out md:visible md:fixed md:inset-y-0 md:mt-24 md:block md:min-w-36 md:translate-x-0 md:transition-none lg:min-w-44 xl:w-80 1.5xl:w-[22rem]"
	>
		<slot name="menu" />
	</div>

	<div
		class="mx-auto max-w-xl overflow-hidden px-5 transition-all duration-500 ease-linear md:ml-64 md:box-content md:w-sm md:max-w-none xl:ml-auto"
	>
		<slot />
	</div>
</main>

<main class="pt-6 relative mx-auto max-w-screen-2.5xl md:flex md:w-full md:flex-row lg:w-auto">
	<div
		class="ease-in-out md:inset-y-0 md:my-24 md:min-w-36 md:translate-x-0 lg:min-w-44 xl:w-80 invisible absolute -translate-x-full transition-all duration-200 md:visible md:fixed md:block md:transition-none 1.5xl:w-[22rem]"
	>
		<slot name="menu" />
	</div>

	<div
		class="max-w-xl px-5 md:ml-64 mx-auto overflow-hidden transition-all duration-500 ease-linear md:box-content md:w-sm md:max-w-none xl:ml-auto"
	>
		<slot />
	</div>
</main>

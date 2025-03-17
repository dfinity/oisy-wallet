#!/bin/bash

npm rm @dfinity/gix-components @sveltejs/adapter-static @sveltejs/kit @sveltejs/vite-plugin-svelte @testing-library/jest-dom @testing-library/svelte @vitest/coverage-v8 svelte svelte-check vite vite-node vitest vitest-mock-extended

npm i @sveltejs/adapter-static @sveltejs/kit @sveltejs/vite-plugin-svelte @testing-library/jest-dom @testing-library/svelte @vitest/coverage-v8 svelte svelte-check vite vite-node vitest vitest-mock-extended -D

npm i dfinity-gix-components-5.1.0.tgz

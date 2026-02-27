#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { findFiles } from './utils.mjs';

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src', 'frontend', 'src');

const ALIASES = {
	$lib: join(SRC, 'lib'),
	$env: join(SRC, 'env'),
	$btc: join(SRC, 'btc'),
	$eth: join(SRC, 'eth'),
	$evm: join(SRC, 'evm'),
	$icp: join(SRC, 'icp'),
	$sol: join(SRC, 'sol'),
	'$icp-eth': join(SRC, 'icp-eth'),
	$routes: join(SRC, 'routes'),
	$tests: join(SRC, 'tests'),
	$declarations: join(ROOT, 'src', 'declarations')
};

const EXTENSIONS = ['.ts', '.js', '.svelte', '.mjs', '.cjs'];

const resolveFile = (base) => {
	if (existsSync(base) && statSync(base).isFile()) {
		return base;
	}

	for (const ext of EXTENSIONS) {
		const withExt = base + ext;
		if (existsSync(withExt)) {
			return withExt;
		}
	}

	for (const ext of EXTENSIONS) {
		const index = join(base, `index${ext}`);
		if (existsSync(index)) {
			return index;
		}
	}

	return null;
};

const resolveImportPath = (importSpec, fromFile) => {
	if (importSpec.startsWith('.')) {
		return resolveFile(join(dirname(fromFile), importSpec));
	}

	for (const [alias, target] of Object.entries(ALIASES)) {
		if (importSpec === alias) {
			return resolveFile(target);
		}
		if (importSpec.startsWith(`${alias}/`)) {
			return resolveFile(join(target, importSpec.slice(alias.length + 1)));
		}
	}

	return null;
};

const extractImports = (filePath) => {
	let content;
	try {
		content = readFileSync(filePath, 'utf-8');
	} catch {
		return [];
	}

	let scriptContent = content;
	if (extname(filePath) === '.svelte') {
		const scriptMatches = [...content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
		scriptContent = scriptMatches.map((m) => m[1]).join('\n');
	}

	const imports = [];

	const staticRe =
		/(?:import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|export\s+(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"])/g;
	let match;
	while ((match = staticRe.exec(scriptContent)) !== null) {
		const spec = match[1] || match[2];
		if (spec) {
			imports.push(spec);
		}
	}

	const dynamicRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
	while ((match = dynamicRe.exec(scriptContent)) !== null) {
		imports.push(match[1]);
	}

	return imports;
};

const buildGraph = () => {
	const files = findFiles({ dir: SRC, extensions: EXTENSIONS });
	const graph = new Map();

	for (const file of files) {
		const absFile = resolve(file);
		const resolved = extractImports(absFile)
			.map((spec) => resolveImportPath(spec, absFile))
			.filter(Boolean)
			.map((p) => resolve(p));

		graph.set(absFile, resolved);
	}

	return graph;
};

const findAllCycles = (graph) => {
	const cycles = [];
	const visited = new Set();
	const inStack = new Set();
	const stack = [];

	const dfs = (node) => {
		if (inStack.has(node)) {
			const cycleStart = stack.indexOf(node);
			cycles.push(stack.slice(cycleStart).concat(node));
			return;
		}

		if (visited.has(node)) {
			return;
		}

		visited.add(node);
		inStack.add(node);
		stack.push(node);

		for (const neighbor of graph.get(node) ?? []) {
			if (graph.has(neighbor)) {
				dfs(neighbor);
			}
		}

		stack.pop();
		inStack.delete(node);
	};

	for (const node of graph.keys()) {
		visited.clear();
		inStack.clear();
		stack.length = 0;
		dfs(node);
	}

	return cycles;
};

const normalizeCycle = (cycle) => {
	const path = cycle.slice(0, -1);
	const minVal = path.reduce((min, p) => (p < min ? p : min), path[0]);
	const minIdx = path.indexOf(minVal);
	return [...path.slice(minIdx), ...path.slice(0, minIdx)];
};

const deduplicateCycles = (cycles) => {
	const seen = new Set();
	const unique = [];

	for (const cycle of cycles) {
		const norm = normalizeCycle(cycle);
		const key = norm.join(' -> ');
		if (!seen.has(key)) {
			seen.add(key);
			unique.push(norm);
		}
	}

	return unique;
};

const shortPath = (absPath) => relative(ROOT, absPath);

const main = () => {
	console.log(`${CYAN}Building import graph...${NC}`);
	const graph = buildGraph();
	console.log(`${DIM}Scanned ${graph.size} files.${NC}`);

	console.log(`${CYAN}Detecting circular imports...${NC}\n`);
	const rawCycles = findAllCycles(graph);
	const cycles = deduplicateCycles(rawCycles).sort((a, b) => a.length - b.length);

	if (cycles.length === 0) {
		console.log(`${GREEN}No circular imports found.${NC}`);
		process.exit(0);
	}

	console.log(`${RED}Found ${cycles.length} circular import chain(s):${NC}\n`);

	for (let i = 0; i < cycles.length; i++) {
		const cycle = cycles[i];
		const label =
			cycle.length === 1 ? `${YELLOW}self-import${NC}` : `${YELLOW}length ${cycle.length}${NC}`;
		console.log(`${RED}Cycle ${i + 1}${NC} (${label})`);
		for (let j = 0; j < cycle.length; j++) {
			const arrow = j < cycle.length - 1 ? ' ->' : ` -> ${DIM}(back to start)${NC}`;
			console.log(`  ${shortPath(cycle[j])}${arrow}`);
		}
		console.log('');
	}

	process.exit(1);
};

main();

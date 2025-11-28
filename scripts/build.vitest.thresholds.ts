#!/usr/bin/env node

import { isNullish } from '@dfinity/utils';
import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG_FILE = 'vitest.config.ts';
const ORIGINAL_FILE = 'vitest.config.before.ts';
const COVERAGE_REGEX = /(lines|functions|branches|statements):\s*([0-9]+(?:\.[0-9]+)?)/g;

type ThresholdKey = 'lines' | 'functions' | 'branches' | 'statements';
type ThresholdMap = Partial<Record<ThresholdKey, number>>;

const extractThresholds = (text: string): ThresholdMap => {
	const map: ThresholdMap = {};
	const regex = new RegExp(COVERAGE_REGEX.source, 'g');

	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		const key = match[1] as ThresholdKey;
		map[key] = parseFloat(match[2]);
	}

	return map;
};

const applyMargin = ({ text, margin }: { text: string; margin: number }): string => {
	const currentThresholds = extractThresholds(text);

	return text.replace(COVERAGE_REGEX, (_: string, key: string, value: string) => {
		const typedKey = key as ThresholdKey;
		const oldValue = currentThresholds[typedKey];

		if (isNullish(oldValue)) {
			// If something is missing, do not change this occurrence
			return `${key}: ${value}`;
		}

		const newValue = (oldValue - margin).toFixed(2);

		return `${key}: ${newValue}`;
	});
};

const enforceNonDecreasingThresholds = ({
	currentText,
	originalText
}: {
	currentText: string;
	originalText: string;
}): string => {
	const originalThresholds = extractThresholds(originalText);
	const currentThresholds = extractThresholds(currentText);

	return currentText.replace(COVERAGE_REGEX, (_: string, key: string, value: string) => {
		const typedKey = key as ThresholdKey;
		const oldValue = originalThresholds[typedKey];
		const newValue = currentThresholds[typedKey];

		if (isNullish(oldValue) || isNullish(newValue)) {
			// If something is missing, do not change this occurrence
			return `${key}: ${value}`;
		}

		if (newValue > oldValue) {
			return `${key}: ${newValue.toFixed(2)}`;
		}

		return `${key}: ${oldValue.toFixed(2)}`;
	});
};

const main = () => {
	const current = readFileSync(CONFIG_FILE, 'utf8');
	const original = readFileSync(ORIGINAL_FILE, 'utf8');

	// The coverage calculation is a bit flaky, so to avoid being stuck, we reduce it to have an acceptable margin
	const withMargin = applyMargin({ text: current, margin: 0.3 });

	// Ensure thresholds never decrease
	const finalText = enforceNonDecreasingThresholds({
		currentText: withMargin,
		originalText: original
	});

	writeFileSync(CONFIG_FILE, finalText);
};

main();

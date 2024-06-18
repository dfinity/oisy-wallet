module.exports = {
	'no-svelte-store-in-api': {
		meta: {
			docs: {
				description:
					'Svelte stores should not be used in APIs since they are also utilized by workers.',
				category: 'Possible Errors',
				recommended: false
			},
			schema: []
		},
		create(context) {
			return {
				ImportDeclaration(node) {
					const filePath = context.getFilename();

					const {
						source: { value }
					} = node;

					if (filePath.includes('/api/') && value === 'svelte/store') {
						context.report({
							node,
							message: "Importing 'svelte/store' is not allowed in API modules."
						});
					}
				}
			};
		}
	},
	'use-nullish-checks': {
		meta: {
			type: 'suggestion',
			docs: {
				description: 'Enforce the use of nonNullish and isNullish functions for nullish checks',
				category: 'Best Practices',
				recommended: true,
			},
			fixable: 'code',
			schema: [],
		},
		create(context) {
			const isNullishMessage = 'Use isNullish() instead of negation for nullish checks.';
			const nonNullishMessage = 'Use nonNullish() instead of direct variable check for nullish checks.';

			function isNullishCheck(node) {
				return (
					node.operator === '!' &&
					node.argument &&
					node.argument.type === 'Identifier'
				);
			}

			function isNonNullishCheck(node) {
				if (node.type === 'Identifier') {
					const parent = node.parent;
					if (parent.type === 'CallExpression' && (parent.callee.name === 'nonNullish' || parent.callee.name === 'isNullish')) {
						return false;
					}
					if (parent.type === 'LogicalExpression') {
						const logicalExp = parent;
						if ((logicalExp.left.type === 'CallExpression' && (logicalExp.left.callee.name === 'nonNullish' || logicalExp.left.callee.name === 'isNullish')) ||
							(logicalExp.right.type === 'CallExpression' && (logicalExp.right.callee.name === 'nonNullish' || logicalExp.right.callee.name === 'isNullish'))) {
							return false;
						}
					}
					if (parent.type === 'IfStatement' && parent.test.type === 'BinaryExpression') {
						const binaryExp = parent.test;
						if ((binaryExp.operator === '===' || binaryExp.operator === '!==') &&
							(binaryExp.left.type === 'Identifier' || binaryExp.right.type === 'Identifier')) {
							return false;
						}
					}
				}
				return true;
			}

			function reportNonNullishCheck(node) {
				context.report({
					node,
					message: nonNullishMessage,
					fix(fixer) {
						return fixer.replaceText(node, `nonNullish(${context.getSourceCode().getText(node)})`);
					},
				});
			}

			return {
				UnaryExpression(node) {
					if (isNullishCheck(node)) {
						context.report({
							node,
							message: isNullishMessage,
							fix(fixer) {
								return fixer.replaceText(node, `isNullish(${context.getSourceCode().getText(node.argument)})`);
							},
						});
					}
				},
				IfStatement(node) {
					if (isNonNullishCheck(node.test)) {
						reportNonNullishCheck(node.test);
					}
				},
				LogicalExpression(node) {
					if (node.operator === '&&' || node.operator === '||') {
						if (isNonNullishCheck(node.left)) {
							reportNonNullishCheck(node.left);
						}
						if (isNonNullishCheck(node.right)) {
							reportNonNullishCheck(node.right);
						}
					}
				},
			};
		},
	}
};

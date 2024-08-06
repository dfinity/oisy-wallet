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
							message: 'Importing \'svelte/store\' is not allowed in API modules.'
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
				description: 'Enforce the use of isNullish functions for nullish checks',
				category: 'Best Practices',
				recommended: true
			},
			fixable: 'code',
			schema: []
		},
		create(context) {
			const isNullishMessage = 'Use isNullish() instead of direct variable check for nullish checks.';
			const nonNullishMessage = 'Use nonNullish() instead of direct variable check for nullish checks.';

			const isNullishCheck = (node) => {
				if (node.type === 'BinaryExpression') {
					return (
						node.operator === '===' &&
						((node.right.type === 'Identifier' && node.right.name === 'undefined') || (node.right.type === 'Literal' && node.right.value === null))
					);
				}
			};

			const isNonNullishCheck = (node) => {
				if (node.type === 'BinaryExpression') {
					return (
						node.operator === '!==' &&
						((node.right.type === 'Identifier' && node.right.name === 'undefined') || (node.right.type === 'Literal' && node.right.value === null))
					);
				}
			};

			const reportNullishCheck = (node) => {
				context.report({
					node,
					message: isNullishMessage,
					fix(fixer) {
						return fixer.replaceText(node, `isNullish(${context.getSourceCode().getText(node.left)})`);
					}
				});
			};

			const reportNonNullishCheck = (node) => {
				context.report({
					node,
					message: nonNullishMessage,
					fix(fixer) {
						return fixer.replaceText(node, `nonNullish(${context.getSourceCode().getText(node.left)})`);
					}
				});
			};

			return {
				BinaryExpression(node) {
					if (isNullishCheck(node)) {
						reportNullishCheck(node);
					}
					if (isNonNullishCheck(node)) {
						reportNonNullishCheck(node);
					}
				}
			};
		}
	}
};

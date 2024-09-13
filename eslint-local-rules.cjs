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
	'use-option-type-wrapper': {
		meta: {
			type: 'suggestion',
			docs: {
				description: 'Enforce use of Option<T> instead of T | null | undefined',
				category: 'Best Practices',
				recommended: true
			},
			fixable: 'code',
			schema: []
		},
		create: function (context) {
			const checkForOptionType = (node) => {
				if (
					node.typeAnnotation.type === 'TSUnionType' &&
					node.typeAnnotation.types.length === 3 &&
					node.typeAnnotation.types.some((t) => t.type === 'TSNullKeyword') &&
					node.typeAnnotation.types.some((t) => t.type === 'TSUndefinedKeyword')
				) {
					const type = node.typeAnnotation.types.find(
						(t) => t.type !== 'TSNullKeyword' && t.type !== 'TSUndefinedKeyword'
					);

					const typeText =
						type.type === 'TSTypeReference' && type.typeName && type.typeName.name
							? type.typeName.name
							: context.getSourceCode().getText(type);

					if (type) {
						try {
							context.report({
								node,
								message: `Use Option<${typeText}> instead of ${typeText} | null | undefined.`,
								fix(fixer) {
									return fixer.replaceText(node.typeAnnotation, `Option<${typeText}>`);
								}
							});
						} catch (e) {
							console.error(e);
							console.log(type);
						}
					}
				}
			};

			return {
				TSTypeAnnotation(node) {
					checkForOptionType(node);
				},
				TSTypeAliasDeclaration(node) {
					checkForOptionType(node);
				}
			};
		}
	}
};

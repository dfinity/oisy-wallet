export const themeVariables = {
	screens: {
		// we need to use rem instead of px because the default tailwind values changed to rem,
		// and mixing units breaks custom screen definitions
		xs: '28rem', // 448px
		'1.5md': '56rem', // 896px
		'1.5lg': '72rem', // 1152px
		'1.5xl': '88rem', // 1408px
		'2.5xl': '108rem', // 1728px
		'h-md': { raw: '(max-height: 68rem)' } // ~1090px
	},
	background: {
		page: 'var(--color-background-page)',
		surface: 'var(--color-background-surface)',
		primary: 'var(--color-background-primary)',
		'primary-alt': 'var(--color-background-primary-alt)',
		'primary-inverted': 'var(--color-background-primary-inverted)',
		'primary-inverted-alt': 'var(--color-background-primary-inverted-alt)',
		secondary: 'var(--color-background-secondary)',
		'secondary-alt': 'var(--color-background-secondary-alt)',
		'secondary-inverted': 'var(--color-background-secondary-inverted)',
		tertiary: 'var(--color-background-tertiary)',
		'tertiary-alt': 'var(--color-background-tertiary-alt)',
		'tertiary-inverted': 'var(--color-background-tertiary-inverted)',
		disabled: 'var(--color-background-disabled)',
		'disabled-alt': 'var(--color-background-disabled-alt)',
		brand: {
			'subtle-5': 'var(--color-background-brand-subtle-5)',
			'subtle-10': 'var(--color-background-brand-subtle-10)',
			'subtle-20': 'var(--color-background-brand-subtle-20)',
			'subtle-30': 'var(--color-background-brand-subtle-30)',
			primary: 'var(--color-background-brand-primary)',
			secondary: 'var(--color-background-brand-secondary)',
			tertiary: 'var(--color-background-brand-tertiary)',
			disabled: 'var(--color-background-brand-disabled)',
			light: 'var(--color-background-brand-light)'
		},
		success: {
			'subtle-10': 'var(--color-background-success-subtle-10)',
			'subtle-20': 'var(--color-background-success-subtle-20)',
			'subtle-30': 'var(--color-background-success-subtle-30)',
			primary: 'var(--color-background-success-primary)',
			secondary: 'var(--color-background-success-secondary)',
			tertiary: 'var(--color-background-success-tertiary)',
			light: 'var(--color-background-success-light)'
		},
		warning: {
			'subtle-10': 'var(--color-background-warning-subtle-10)',
			'subtle-20': 'var(--color-background-warning-subtle-20)',
			'subtle-30': 'var(--color-background-warning-subtle-30)',
			primary: 'var(--color-background-warning-primary)',
			secondary: 'var(--color-background-warning-secondary)',
			tertiary: 'var(--color-background-warning-tertiary)',
			light: 'var(--color-background-warning-light)'
		},
		error: {
			'subtle-10': 'var(--color-background-error-subtle-10)',
			'subtle-20': 'var(--color-background-error-subtle-20)',
			'subtle-30': 'var(--color-background-error-subtle-30)',
			primary: 'var(--color-background-error-primary)',
			secondary: 'var(--color-background-error-secondary)',
			tertiary: 'var(--color-background-error-tertiary)',
			light: 'var(--color-background-error-light)'
		}
	},
	border: {
		basic: 'var(--color-border-basic)',
		primary: 'var(--color-border-primary)',
		'primary-inverted': 'var(--color-border-primary-inverted)',
		secondary: 'var(--color-border-secondary)',
		'secondary-inverted': 'var(--color-border-secondary-inverted)',
		tertiary: 'var(--color-border-tertiary)',
		'tertiary-inverted': 'var(--color-border-tertiary-inverted)',
		disabled: 'var(--color-border-disabled)',
		brand: {
			'subtle-10': 'var(--color-border-brand-subtle-10)',
			'subtle-20': 'var(--color-border-brand-subtle-20)',
			'subtle-30': 'var(--color-border-brand-subtle-30)',
			primary: 'var(--color-border-brand-primary)',
			secondary: 'var(--color-border-brand-secondary)',
			tertiary: 'var(--color-border-brand-tertiary)',
			disabled: 'var(--color-border-brand-disabled)'
		},
		success: {
			'subtle-10': 'var(--color-border-success-subtle-10)',
			'subtle-20': 'var(--color-border-success-subtle-20)',
			'subtle-30': 'var(--color-border-success-subtle-30)',
			solid: 'var(--color-border-success-solid)',
			'solid-alt': 'var(--color-border-success-solid-alt)'
		},
		warning: {
			'subtle-10': 'var(--color-border-warning-subtle-10)',
			'subtle-20': 'var(--color-border-warning-subtle-20)',
			'subtle-30': 'var(--color-border-warning-subtle-30)',
			solid: 'var(--color-border-warning-solid)',
			'solid-alt': 'var(--color-border-warning-solid-alt)'
		},
		error: {
			'subtle-10': 'var(--color-border-error-subtle-10)',
			'subtle-20': 'var(--color-border-error-subtle-20)',
			'subtle-30': 'var(--color-border-error-subtle-30)',
			solid: 'var(--color-border-error-solid)',
			'solid-alt': 'var(--color-border-error-solid-alt)'
		}
	},
	foreground: {
		primary: 'var(--color-foreground-primary)',
		'primary-inverted': 'var(--color-foreground-primary-inverted)',
		'primary-inverted-alt': 'var(--color-foreground-primary-inverted-alt)',
		'secondary-inverted': 'var(--color-foreground-secondary-inverted)',
		tertiary: 'var(--color-foreground-tertiary)',
		'tertiary-inverted': 'var(--color-foreground-tertiary-inverted)',
		disabled: 'var(--color-foreground-disabled)',
		brand: {
			primary: 'var(--color-foreground-brand-primary)',
			'primary-alt': 'var(--color-foreground-brand-primary-alt)',
			'primary-inverted': 'var(--color-foreground-brand-primary-inverted)',
			secondary: 'var(--color-foreground-brand-secondary)',
			'secondary-alt': 'var(--color-foreground-brand-secondary-alt)',
			tertiary: 'var(--color-foreground-brand-tertiary)',
			'tertiary-alt': 'var(--color-foreground-brand-tertiary-alt)',
			disabled: 'var(--color-foreground-brand-disabled)'
		},
		'success-primary': 'var(--color-foreground-success-primary)',
		'success-alt': 'var(--color-foreground-success-alt)',
		'success-secondary': 'var(--color-foreground-success-secondary)',
		'warning-primary': 'var(--color-foreground-warning-primary)',
		'warning-alt': 'var(--color-foreground-warning-alt)',
		'error-primary': 'var(--color-foreground-error-primary)',
		'error-alt': 'var(--color-foreground-error-alt)',
		'error-secondary': 'var(--color-foreground-error-secondary)'
	},

	// custom hard coded gradient colors
	gradient: {
		'default-0': '#016DFC',
		'default-100': '#004EB5',
		'icp-0': '#3B00B9',
		'icp-100': '#7014A4',
		'btc-0': '#F7931A',
		'btc-100': '#DE7900',
		'eth-0': '#627EEA',
		'eth-100': '#E18DFF',
		'sol-0': '#904EFA',
		'sol-100': '#1DE59D',
		'trump-0': '#232BCC',
		'trump-100': '#000797',
		'gold-0': '#CCA055',
		'gold-100': '#EBD27F'
	}
};

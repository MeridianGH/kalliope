import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import jsdoc from 'eslint-plugin-jsdoc'
import globals from 'globals'

const stylisticConfig = stylistic.configs.customize({
  indent: 2,
  quotes: 'single',
  semi: false,
  jsx: true,
  arrowParens: true,
  braceStyle: '1tbs',
  blockSpacing: true,
  quoteProps: 'as-needed',
  commaDangle: 'never'
})
Object.entries(stylisticConfig.rules).map(([rule, options]) => {
  if (typeof options === 'string' || typeof options === 'number') {
    stylisticConfig.rules[rule] = 'warn'
  } else {
    stylisticConfig.rules[rule][0] = 'warn'
  }
})

// noinspection JSUnusedGlobalSymbols, JSCheckFunctionSignatures
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }]
    }
  },
  jsdoc.configs['flat/recommended-typescript'],
  stylisticConfig,
  {
    rules: Object.fromEntries(Object.entries({
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'max-statements-per-line': ['warn', { max: 2 }],
      'brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      'block-spacing': ['warn', 'always'],
      'keyword-spacing': ['warn', { before: true, after: true }],
      'key-spacing': ['warn', { beforeColon: false, afterColon: true }],
      'no-multi-spaces': ['warn', { ignoreEOLComments: false }],
      'object-curly-spacing': ['warn', 'always'],
      'arrow-spacing': ['warn', { before: true, after: true }],
      'comma-spacing': ['warn', { before: false, after: true }],
      'switch-colon-spacing': ['warn', { before: false, after: true }],
      'space-before-blocks': ['warn', 'always'],
      'space-before-function-paren': ['warn', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
      'no-trailing-spaces': ['warn', { skipBlankLines: false, ignoreComments: false }],
      'no-whitespace-before-property': ['warn'],
      'operator-linebreak': ['warn', 'after'],
      'implicit-arrow-linebreak': ['warn', 'beside'],
      'object-curly-newline': ['warn', { multiline: true }],
      'array-bracket-newline': ['warn', { multiline: true }],
      'function-call-argument-newline': ['warn', 'consistent'],
      'multiline-ternary': ['warn', 'always-multiline'],
      'comma-style': ['warn', 'last'],
      'comma-dangle': ['warn', 'never'],
      'dot-location': ['warn', 'property'],
      'quote-props': ['warn', 'consistent-as-needed'],
      'arrow-parens': ['warn', 'always'],
      'no-extra-parens': ['warn', 'all', { ignoreJSX: 'multi-line' }],
      'eol-last': ['warn', 'always'],
      'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 0 }],
      'member-delimiter-style': ['warn', { singleline: { delimiter: 'comma', requireLast: false }, multiline: { delimiter: 'comma', requireLast: false } }]
    }).map(([rule, options]) => ['@stylistic/' + rule, options]))
  },
  {
    languageOptions: {
      parserOptions: {
        project: '**/tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: { ...globals.node }
    },
    rules: {
      'curly': ['warn', 'all'],
      'no-unused-vars': ['off'],
      'dot-notation': ['off']
    }
  },
  { ignores: ['dist/'] },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked]
  }
)

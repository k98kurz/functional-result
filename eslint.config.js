import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'max-len': [
        'error',
        { code: 85, ignoreUrls: true, ignorePattern: '^\\s*// ' },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'examples/illustrative/'],
  }
);

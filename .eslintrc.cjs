module.exports = {
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        browser: true,
        es6: true,
        jquery: true,
    },
    extends: [
        'eslint:recommended',
        '@typhonjs-fvtt/eslint-config-foundry.js/0.8.0',
        'plugin:prettier/recommended',
    ],
    plugins: [],
    rules: {
        // Specify any specific ESLint rules.
    },
    overrides: [
        {
            files: ['./*.js', './*.cjs'],
            env: {
                node: true,
            },
        },
    ],
};

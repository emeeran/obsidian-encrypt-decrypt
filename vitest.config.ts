import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/types.ts', 'src/constants.ts'],
        },
    },
});

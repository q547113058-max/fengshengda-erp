module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '(.*\\.spec\\.ts|.*\\.e2e-spec\\.ts)$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'modules/**/*.ts',
    'dto/**/*.ts',
    'common/**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
  ],
  coverageThreshold: {
    global: { lines: 30, statements: 30 },
  },
  testTimeout: 30000,
};

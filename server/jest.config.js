module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '(.*\\.spec\\.ts|.*\\.e2e-spec\\.ts)$',
  // SQLite 测试库 + 全局 in-memory 容易锁竞争 → 默认 1 worker 串行
  maxWorkers: 1,
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

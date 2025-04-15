/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  verbose: true,
  preset: 'ts-jest/presets/default-esm',
  // preset: 'ts-jest',
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   },
  // },
  transform: {
    '^.+\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};

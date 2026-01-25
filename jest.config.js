module.exports = {
  // 1. Use your existing Node environment
  testEnvironment: 'node',

  // 2. Register the Custom Logger we just created
  // 'default' keeps the standard console output.
  // '<rootDir>/test-logger.js' adds your data recording.


  // 3. Optional: Make output verbose so you see every test step
  verbose: true,
};
require('./harness');

async function main() {
  try {
    require('./app.e2e-spec.js');
    const { run } = require('./harness');
    await run();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

main();

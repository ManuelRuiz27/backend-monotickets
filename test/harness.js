const suites = [];
let currentSuite = null;

function createSuite(name) {
  return {
    name,
    tests: [],
    beforeAll: [],
    afterAll: [],
    suites: [],
    parent: currentSuite,
  };
}

function describe(name, fn) {
  const suite = createSuite(name);
  if (currentSuite) {
    currentSuite.suites.push(suite);
  } else {
    suites.push(suite);
  }
  const previous = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = previous;
  }
}

function registerTest(name, fn) {
  if (!currentSuite) {
    describe('root', () => {
      it(name, fn);
    });
    return;
  }
  currentSuite.tests.push({ name, fn });
}

function beforeAll(fn) {
  if (!currentSuite) {
    throw new Error('beforeAll must be used within a describe block');
  }
  currentSuite.beforeAll.push(fn);
}

function afterAll(fn) {
  if (!currentSuite) {
    throw new Error('afterAll must be used within a describe block');
  }
  currentSuite.afterAll.push(fn);
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  if (a && b && typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
  };
}

async function runSuite(suite, depth = 0) {
  const indent = '  '.repeat(depth);
  if (suite.name) {
    console.log(`${indent}${suite.name}`);
  }
  for (const hook of suite.beforeAll) {
    await hook();
  }
  for (const test of suite.tests) {
    try {
      await test.fn();
      console.log(`${indent}  ✓ ${test.name}`);
    } catch (error) {
      console.error(`${indent}  ✗ ${test.name}`);
      console.error(error && error.stack ? error.stack : error);
      throw error;
    }
  }
  for (const child of suite.suites) {
    await runSuite(child, depth + 1);
  }
  for (const hook of suite.afterAll) {
    try {
      await hook();
    } catch (error) {
      console.error('Error in afterAll hook', error);
    }
  }
}

async function run() {
  for (const suite of suites) {
    await runSuite(suite);
  }
}

global.describe = describe;
global.it = registerTest;
global.test = registerTest;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.expect = expect;

module.exports = { run };

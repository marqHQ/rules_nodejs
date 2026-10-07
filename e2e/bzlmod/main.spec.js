const leftPad = require('left-pad');
if (leftPad('ok', 8, '.') !== '......ok') {
  throw new Error('left-pad was not linked from @npm');
}
console.log('nodejs_test ok');

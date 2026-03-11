#!/usr/bin/env node
// Patches clone-stats to avoid deprecated fs.Stats constructor (Node 22+)
const fs = require('fs');
const path = require('path');

const patch = `var Stat = require('fs').Stats

module.exports = cloneStats

function cloneStats(stats) {
  var replacement = Object.create(Stat.prototype)

  Object.keys(stats).forEach(function(key) {
    replacement[key] = stats[key]
  })

  return replacement
}
`;

const targets = [
  'node_modules/clone-stats/index.js',
  'node_modules/gulp-util/node_modules/clone-stats/index.js',
];

targets.forEach(function(target) {
  const fullPath = path.join(__dirname, '..', target);
  if (fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, patch);
    console.log('Patched: ' + target);
  }
});

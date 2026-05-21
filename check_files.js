const fs = require('fs');
const files = fs.readdirSync('.');
console.log('Files in directory:');
files.forEach(f => {
  const stats = fs.statSync(f);
  if (stats.isFile()) {
    console.log(`[FILE] ${f} (${stats.size} bytes)`);
  } else {
    console.log(`[DIR]  ${f}`);
  }
});

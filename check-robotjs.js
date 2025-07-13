const fs = require('fs');
const path = require('path');

// Check if robotjs was rebuilt
const robotjsBuildPath = path.join(__dirname, 'node_modules', 'robotjs', 'build', 'Release', 'robotjs.node');

console.log('Checking robotjs build...');
console.log('Build path:', robotjsBuildPath);

if (fs.existsSync(robotjsBuildPath)) {
  console.log('✅ robotjs.node exists');
  
  // Check file stats
  const stats = fs.statSync(robotjsBuildPath);
  console.log('File size:', stats.size);
  console.log('Modified:', stats.mtime);
  
  // Try to load it
  try {
    const robot = require('robotjs');
    console.log('✅ robotjs loaded successfully!');
    console.log('Mouse position:', robot.getMousePos());
  } catch (error) {
    console.error('❌ Failed to load robotjs:', error.message);
  }
} else {
  console.error('❌ robotjs.node not found');
}

// Test script to check if robotjs works after rebuild
try {
  console.log('Testing robotjs import...');
  import('robotjs').then(robot => {
    console.log('✅ robotjs imported successfully!');
    console.log('Mouse position:', robot.default.getMousePos());
    console.log('✅ robotjs is working correctly!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ robotjs import failed:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ robotjs test failed:', error.message);
  process.exit(1);
}

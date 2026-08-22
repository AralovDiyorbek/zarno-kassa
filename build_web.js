const { execSync } = require('child_process');

console.log('Building Expo Web App for Vercel...');
execSync('npx expo export --platform web', { stdio: 'inherit' });
console.log('Expo Web build completed successfully!');


const fs = require('fs');
const path = require('path');

// Ensure this path points to the correct location
const filePath = path.join(
    process.cwd(),
    'node_modules',
    '@supabase',
    'tracing',
    'dist',
    'main',
    'extract.js'
);

if (fs.existsSync(filePath)) {
    console.log('Patching @supabase/tracing...');
    let content = fs.readFileSync(filePath, 'utf8');

    // This regex matches the webpack/vite/turbopack comments and removes them
    const updatedContent = content.replace(
        /\/\*[\s\S]*?\*\/\s*import\(/g,
        'import('
    );

    fs.writeFileSync(filePath, updatedContent);
    console.log('Successfully patched @supabase/tracing.');
} else {
    console.warn('File not found, skipping patch:', filePath);
}
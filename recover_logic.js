const fs = require('fs');

let lines = fs.readFileSync('App.js.cache', 'utf8').split('\n');

const startStr = 'const loadAll = async () => {';
const endStr = 'const getCategoryName = categoryId => {';

let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(startStr) && start === -1) start = i;
  if (lines[i].includes(endStr)) end = i;
}

let code = lines.slice(start, end).join('\n');

// Replace Babel artifacts
code = code.replace(/Alert\.default\.alert/g, 'Alert.alert');
code = code.replace(/\(0, _react\.useEffect\)/g, 'useEffect');
code = code.replace(/\(0, _react\.useMemo\)/g, 'useMemo');

// Remove auth session checks and parameters completely
code = code.replace(/if \(\!session\?\.user\?\.id\) return;/g, '');
code = code.replace(/if \(\!session\?\.user\?\.id\) \{[\s\S]*?\}/g, '');
code = code.replace(/if \(session\?\.user\?\.id\) \{/g, 'if (true) {');
code = code.replace(/user_id: session\.user\.id,/g, '');
code = code.replace(/\.eq\("user_id", session\.user\.id\)/g, '');
code = code.replace(/user_id: session\.user\.id/g, ''); // no comma case

fs.writeFileSync('recovered_logic.js', code);
console.log('Recovered logic lines:', end - start);

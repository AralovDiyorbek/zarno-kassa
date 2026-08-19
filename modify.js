const fs = require("fs");

let content = fs.readFileSync("App.js", "utf-8");

// 1. Remove AuthScreen component
content = content.replace(/\/\* =+[\s\S]*?AUTH SCREEN[\s\S]*?=+ \*\/\s*function AuthScreen\(\) \{[\s\S]*?\}\s*(?=\/\* =+[\s\S]*?MAIN APP[\s\S]*?=+ \*\/)/, "");

// 2. Change session initialization
content = content.replace(
  /const \[session, setSession\] = useState\(null\);/,
  `const [session, setSession] = useState({ user: { id: "local-user" } });`
);

// 3. Change authLoading initialization
content = content.replace(
  /const \[authLoading, setAuthLoading\] =\s*useState\(true\);/,
  `const [authLoading, setAuthLoading] = useState(false);`
);

// 4. Remove useEffect for AUTH SESSION
content = content.replace(
  /\/\* =+[\s\S]*?AUTH SESSION[\s\S]*?=+ \*\/[\s\S]*?useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/,
  ""
);

// 5. Remove authLoading render block
content = content.replace(
  /if \(authLoading\) \{[\s\S]*?return \([\s\S]*?Tekshirilmoqda\.\.\.[\s\S]*?<\/SafeAreaView>[\s\S]*?\);[\s\S]*?\}/,
  ""
);

// 6. Remove AuthScreen render block
content = content.replace(
  /\/\* =+[\s\S]*?AUTH SCREEN[\s\S]*?=+ \*\/[\s\S]*?if \(\!session\) \{[\s\S]*?return <AuthScreen \/>;[\s\S]*?\}/,
  ""
);

fs.writeFileSync("App.js", content);
console.log("App.js modified successfully.");

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'job-offers', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Inject console logs
const pattern = /const msgs = await getApplicationMessages\(app\.id\);\s*setMessages\(msgs \|\| \[\]\);/;
const replacement = `const msgs = await getApplicationMessages(app.id);
        console.log("DEBUG Student Messages Fetched for App:", app.id, msgs);
        setMessages(msgs || []);`;

if (content.match(pattern)) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Patched successfully");
} else {
    console.log("Pattern not found");
}

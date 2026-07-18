const fs = require('fs');
let code = fs.readFileSync('backend/src/index.ts', 'utf8');

code = code.replace(/^import \{ Pool \} from 'pg';\r?\n/m, '');
code = code.replace(/import \{ ingestKnowledge, chatWithRAG \} from '\.\/rag';/, "import { chatWithRAG, refreshKnowledgeBase } from './rag';");
code = code.replace(/\/\/ Database connection[\s\S]*?port: parseInt\(process\.env\.DB_PORT \|\| '5432'\),\s*\n\}\);\r?\n/, '');
const oldEndpoint = /const response = await chatWithRAG\(pool, message, userRole\);/;
code = code.replace(oldEndpoint, "const response = await chatWithRAG(message, userRole);");
code = code.replace(/(app\.listen\(port, \(\) => \{)/, "refreshKnowledgeBase().then(() => console.log('[RAG] Pamiec podreczna (Cache) zainicjowana.'));\n\n$1");

fs.writeFileSync('backend/src/index.ts', code);
console.log('Zaktualizowano index.ts');

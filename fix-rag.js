const fs = require('fs');
let code = fs.readFileSync('backend/src/rag.ts', 'utf8');

// Add refreshPromise variable
code = code.replace(/let memoryWiki: KnowledgeDoc\[\] = \[\];/, "let memoryWiki: KnowledgeDoc[] = [];\nlet refreshPromise: Promise<void> | null = null;");

// Wrap refreshKnowledgeBase
code = code.replace(/export const refreshKnowledgeBase = async \(\) => \{/, 
"export const refreshKnowledgeBase = async () => {\n  if (refreshPromise) return refreshPromise;\n  refreshPromise = (async () => {");

code = code.replace(/memoryWiki = newWiki;\n    console\.log\(\\[RAG\] Odœwie¿anie zakoñczone\. Pobrano \$\{memoryWiki\.length\} dokumentów\.\\);\n  \} catch \(error\) \{/, 
"memoryWiki = newWiki;\n    console.log([RAG] Odœwie¿anie zakoñczone. Pobrano  dokumentów.);\n  } catch (error) {\n    console.error('[RAG] B³¹d podczas odœwie¿ania wiedzy:', error);\n  } finally {\n    refreshPromise = null;\n  }\n};\nconst _dummyCatch = () => { try {");

// Add await refreshKnowledgeBase() to chatWithRAG
code = code.replace(/export async function chatWithRAG\(userMessage: string, userRole: string = 'Rodzic'\) \{/, 
"export async function chatWithRAG(userMessage: string, userRole: string = 'Rodzic') {\n  if (memoryWiki.length === 0) {\n    console.log('[RAG] memoryWiki puste, wymuszam odswiezenie...');\n    await refreshKnowledgeBase();\n  }");

fs.writeFileSync('backend/src/rag.ts', code, 'utf8');

#!/usr/bin/env node
// build-data.js
// Converts JSON data files to TypeScript

const fs = require('fs');
const path = require('path');

const dataDir = __dirname;
const jsonFile = path.join(dataDir, 'all-ssic-data.json');
const outputFile = path.join(dataDir, 'data.ts');

// Read JSON data
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// Generate TypeScript
let output = `// data.ts
// Generated SSIC records data - DO NOT EDIT MANUALLY
// Run build-data.js to regenerate

import { SsicRecord } from './types';

export const SSIC_DATA: SsicRecord[] = `;

output += JSON.stringify(data, null, 2);
output += ';\n';

// Write output
fs.writeFileSync(outputFile, output);

console.log(`Generated ${outputFile} with ${data.length} records`);

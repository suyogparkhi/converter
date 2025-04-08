import * as fs from 'fs';
import path from 'path';
import { Graph } from './types';
import { convertTypeScriptDependencies } from './typescript-converter';
import { convertJavaDependencies } from './java-converter';
import { convertDjangoDependencies } from './django-converter';

/**
 * Detect the type of dependency data based on file content
 */
function detectDependencyType(data: any): 'typescript' | 'java' | 'django' | 'unknown' {
  // Check for React TypeScript component-based dependencies (new format)
  if (!Array.isArray(data) && data.components && typeof data.components === 'object') {
    return 'typescript';
  }
  
  // Check for TypeScript dependencies (legacy format)
  if (Array.isArray(data) && data.length > 0 && data[0].fileName && data[0].exports) {
    return 'typescript';
  }
  
  // Check for Java dependencies
  if (!Array.isArray(data) && data.name && data.elements) {
    return 'java';
  }
  
  // Check for Django dependencies
  if (!Array.isArray(data) && data.metadata && data.apps && data.models) {
    return 'django';
  }
  
  return 'unknown';
}

/**
 * Convert dependencies to standardized format
 */
export function convertDependencies(data: any): Graph {
  const type = detectDependencyType(data);
  
  switch (type) {
    case 'typescript':
      return convertTypeScriptDependencies(data);
    case 'java':
      return convertJavaDependencies(data);
    case 'django':
      return convertDjangoDependencies(data);
    default:
      throw new Error(`Unknown dependency data format`);
  }
}

/**
 * Load dependencies from file and convert to standardized format
 */
export function convertDependenciesFromFile(filePath: string): Graph {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return convertDependencies(data);
  } catch (error) {
    console.error(`Error loading or parsing file: ${filePath}`, error);
    throw error;
  }
}

// CLI interface
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node dist/index.js <dependency-file.json> [output-file.json]');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  try {
    const result = convertDependenciesFromFile(inputFile);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`Converted dependencies written to ${outputFile}`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error converting dependencies:', error);
    process.exit(1);
  }
} 
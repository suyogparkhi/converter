/**
 * TypeScript dependencies converter
 */

import { Graph, Node, Edge, Section, Item } from './types';
import { generateId, createSection, createItem, determineNodeType } from './utils';

interface TypeScriptDependency {
  fileName: string;
  filePath: string;
  exports: {
    components: any[];
    functions: any[];
    interfaces: any[];
    types: any[];
    classes: any[];
    variables: any[];
  };
  imports: {
    name: string;
    path: string;
    namedImports: string[];
    defaultImport: string;
    isTypeOnly: boolean;
    resolvedFilePath?: string;
  }[];
  incomingDependencies: string[];
  outgoingDependencies: string[];
  usedByComponents: string[];
}

export function convertTypeScriptDependencies(dependencies: TypeScriptDependency[]): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>(); // Maps file paths to node IDs
  
  // First pass: create nodes
  dependencies.forEach(dependency => {
    const nodeId = generateId('ts', dependency.filePath);
    nodeMap.set(dependency.filePath, nodeId);
    
    const sections: Section[] = [];
    
    // Create imports section
    if (dependency.imports.length > 0) {
      const importItems: Item[] = dependency.imports.map(imp => {
        const value = imp.defaultImport 
          ? `${imp.defaultImport} from '${imp.path}'` 
          : `{ ${imp.namedImports.join(', ')} } from '${imp.path}'`;
        
        return createItem(
          generateId('imp', `${dependency.filePath}_${imp.path}`),
          value,
          'import',
          { path: imp.path, isTypeOnly: imp.isTypeOnly }
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_imports`),
        'Imports',
        importItems
      ));
    }
    
    // Create exports section
    const exportItems: Item[] = [];
    
    // Add functions
    dependency.exports.functions.forEach(func => {
      exportItems.push(createItem(
        generateId('func', `${dependency.filePath}_${func.name}`),
        `${func.name}(${func.params.map((p: any) => p.name).join(', ')}): ${func.returnType}`,
        'function',
        { isExported: func.isExported }
      ));
    });
    
    // Add classes
    dependency.exports.classes.forEach(cls => {
      exportItems.push(createItem(
        generateId('class', `${dependency.filePath}_${cls.name}`),
        cls.name,
        'class',
        { isExported: cls.isExported }
      ));
    });
    
    // Add interfaces
    dependency.exports.interfaces.forEach(intf => {
      exportItems.push(createItem(
        generateId('interface', `${dependency.filePath}_${intf.name}`),
        intf.name,
        'interface',
        { isExported: intf.isExported }
      ));
    });
    
    // Add types
    dependency.exports.types.forEach(type => {
      exportItems.push(createItem(
        generateId('type', `${dependency.filePath}_${type.name}`),
        type.name,
        'type',
        { isExported: type.isExported }
      ));
    });
    
    // Add components
    dependency.exports.components.forEach(comp => {
      exportItems.push(createItem(
        generateId('component', `${dependency.filePath}_${comp.name}`),
        comp.name,
        'component',
        { isExported: comp.isExported }
      ));
    });
    
    // Add variables
    dependency.exports.variables.forEach(variable => {
      exportItems.push(createItem(
        generateId('var', `${dependency.filePath}_${variable.name}`),
        variable.name,
        'variable',
        { isExported: variable.isExported }
      ));
    });
    
    if (exportItems.length > 0) {
      sections.push(createSection(
        generateId('sec', `${nodeId}_exports`),
        'Exports',
        exportItems
      ));
    }
    
    nodes.push({
      id: nodeId,
      title: dependency.fileName,
      type: 'file',
      sections,
      metadata: {
        filePath: dependency.filePath,
        fileName: dependency.fileName
      }
    });
  });
  
  // Second pass: create edges
  dependencies.forEach(dependency => {
    const sourceNodeId = nodeMap.get(dependency.filePath);
    
    if (!sourceNodeId) return;
    
    // Create outgoing dependency edges
    dependency.outgoingDependencies.forEach(target => {
      const targetNodeId = nodeMap.get(target);
      
      if (targetNodeId) {
        edges.push({
          source: sourceNodeId,
          target: targetNodeId,
          type: 'dependency',
          metadata: {
            direction: 'outgoing'
          }
        });
      }
    });
    
    // Create incoming dependency edges
    dependency.incomingDependencies.forEach(source => {
      const sourceId = nodeMap.get(source);
      
      if (sourceId) {
        edges.push({
          source: sourceId,
          target: sourceNodeId,
          type: 'dependency',
          metadata: {
            direction: 'incoming'
          }
        });
      }
    });
  });
  
  return {
    nodes,
    edges,
    metadata: {
      projectType: 'typescript',
      projectName: 'TypeScript Project',
      convertedAt: new Date().toISOString(),
      originalFormat: {}
    }
  };
} 
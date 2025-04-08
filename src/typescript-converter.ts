/**
 * TypeScript dependencies converter
 */

import { Graph, Node, Edge, Section, Item } from './types';
import { generateId, createSection, createItem, determineNodeType } from './utils';

// New interface for component-based TypeScript dependencies
interface TypeScriptComponent {
  name: string;
  filePath: string;
  props: {
    name: string;
    type?: string;
    required?: boolean;
  }[];
  state: {
    name: string;
    type?: string;
    initialValue?: string;
  }[];
  hooks: {
    type: string;
    customHook: boolean;
    dependencies?: any[];
  }[];
  dependencies: {
    name: string;
    path: string;
    isExternal?: boolean;
  }[];
  children: string[];
}

// Legacy interface kept for backward compatibility
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

// Helper to format function parameters
function formatParams(params: any[] = []): string {
  if (!params || params.length === 0) return '()';
  return `(${params.map((p: any) => p.name).join(', ')})`;
}

// Check if the input data is in the new component-based format
function isComponentBasedFormat(data: any): boolean {
  return !Array.isArray(data) && data.components !== undefined;
}

// Convert component-based TypeScript dependencies
export function convertTypeScriptDependencies(typescriptData: any): Graph {
  // Detect data format and use appropriate converter
  if (isComponentBasedFormat(typescriptData)) {
    return convertComponentBasedTypeScript(typescriptData);
  } else {
    // Legacy format handling
    return convertLegacyTypeScriptDependencies(typescriptData);
  }
}

// Convert component-based TypeScript format to standard graph format
function convertComponentBasedTypeScript(data: { components: Record<string, TypeScriptComponent> }): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>(); // Maps component names to node IDs
  const filePathMap = new Map<string, string>(); // Maps file paths to node IDs
  
  // Create nodes for each component
  Object.values(data.components).forEach(component => {
    const nodeId = generateId('comp', component.name);
    nodeMap.set(component.name, nodeId);
    filePathMap.set(component.filePath, nodeId);
    
    const sections: Section[] = [];
    
    // Create props section if available
    if (component.props && component.props.length > 0) {
      const propItems = component.props.map(prop => {
        const required = prop.required ? ' (required)' : '';
        const type = prop.type ? `: ${prop.type}` : '';
        
        return createItem(
          generateId('prop', `${component.name}_${prop.name}`),
          `${prop.name}${type}${required}`,
          'prop'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_props`),
        'Props',
        propItems
      ));
    }
    
    // Create state section if available
    if (component.state && component.state.length > 0) {
      const stateItems = component.state.map(state => {
        const type = state.type ? `: ${state.type}` : '';
        const initialValue = state.initialValue ? ` = ${state.initialValue}` : '';
        
        return createItem(
          generateId('state', `${component.name}_${state.name}`),
          `${state.name}${type}${initialValue}`,
          'state'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_state`),
        'State',
        stateItems
      ));
    }
    
    // Create hooks section if available
    if (component.hooks && component.hooks.length > 0) {
      const hookItems = component.hooks.map(hook => {
        const custom = hook.customHook ? ' (custom)' : '';
        
        return createItem(
          generateId('hook', `${component.name}_${hook.type}`),
          `${hook.type}${custom}`,
          'hook'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_hooks`),
        'Hooks',
        hookItems
      ));
    }
    
    // Create dependencies section if available
    if (component.dependencies && component.dependencies.length > 0) {
      const dependencyItems = component.dependencies.map(dep => {
        const external = dep.isExternal ? ' (external)' : '';
        
        return createItem(
          generateId('dep', `${component.name}_${dep.name}`),
          `${dep.name} from '${dep.path}'${external}`,
          'dependency'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_dependencies`),
        'Dependencies',
        dependencyItems
      ));
    }
    
    // Create children section if available
    if (component.children && component.children.length > 0) {
      const childrenItems = component.children.map(child => {
        return createItem(
          generateId('child', `${component.name}_${child}`),
          child,
          'component'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_children`),
        'Children',
        childrenItems
      ));
    }
    
    nodes.push({
      id: nodeId,
      title: component.name,
      type: 'component',
      sections,
      metadata: {
        filePath: component.filePath,
        name: component.name
      }
    });
  });
  
  // Create edges for component dependencies
  Object.values(data.components).forEach(component => {
    const sourceNodeId = nodeMap.get(component.name);
    
    if (!sourceNodeId) return;
    
    // Create edges for component dependencies
    component.dependencies.forEach(dep => {
      const targetNodeId = nodeMap.get(dep.name);
      
      if (targetNodeId) {
        edges.push({
          source: sourceNodeId,
          target: targetNodeId,
          type: 'dependency',
          metadata: {
            path: dep.path,
            isExternal: dep.isExternal
          }
        });
      }
    });
    
    // Create edges for component children
    component.children.forEach(child => {
      const targetNodeId = nodeMap.get(child);
      
      if (targetNodeId) {
        edges.push({
          source: sourceNodeId,
          target: targetNodeId,
          type: 'renders',
          metadata: {
            relationship: 'parent-child'
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
      projectName: 'React TypeScript Project',
      convertedAt: new Date().toISOString(),
      originalFormat: {}
    }
  };
}

// Legacy TypeScript converter - kept for backward compatibility
function convertLegacyTypeScriptDependencies(dependencies: TypeScriptDependency[]): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>(); // Maps file paths to node IDs
  
  // First pass: create nodes and build id map
  dependencies.forEach(dependency => {
    const nodeId = generateId('ts', dependency.filePath);
    nodeMap.set(dependency.filePath, nodeId);
    
    const sections: Section[] = [];
    
    // Create imports section if available
    if (dependency.imports && dependency.imports.length > 0) {
      const importItems: Item[] = dependency.imports.map(imp => {
        const value = imp.namedImports.length > 0 
          ? `{ ${imp.namedImports.join(', ')} } from '${imp.path}'`
          : imp.defaultImport 
            ? `${imp.defaultImport} from '${imp.path}'`
            : `{  } from '${imp.path}'`;
        
        return createItem(
          generateId('imp', `${dependency.filePath}_${imp.path}`),
          value,
          'import',
          { 
            path: imp.path,
            isTypeOnly: imp.isTypeOnly,
            resolvedFilePath: imp.resolvedFilePath
          }
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_imports`),
        'Imports',
        importItems
      ));
    }
    
    // Create exports section if available
    const exportItems: Item[] = [];
    
    // Add exported functions
    if (dependency.exports.functions && dependency.exports.functions.length > 0) {
      dependency.exports.functions.forEach(func => {
        if (func.isExported) {
          exportItems.push(createItem(
            generateId('func', `${dependency.filePath}_${func.name}`),
            `${func.name}${formatParams(func.params)}: ${func.returnType || 'void'}`,
            'function',
            { isExported: true }
          ));
        }
      });
    }
    
    // Add exported components
    if (dependency.exports.components && dependency.exports.components.length > 0) {
      dependency.exports.components.forEach(comp => {
        exportItems.push(createItem(
          generateId('comp', `${dependency.filePath}_${comp.name}`),
          `${comp.name}: ${comp.type || 'Component'}`,
          'component',
          { isExported: true }
        ));
      });
    }
    
    // Add exported types/interfaces
    if (dependency.exports.interfaces && dependency.exports.interfaces.length > 0) {
      dependency.exports.interfaces.forEach(intf => {
        exportItems.push(createItem(
          generateId('intf', `${dependency.filePath}_${intf.name}`),
          `${intf.name}`,
          'interface',
          { isExported: true }
        ));
      });
    }
    
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
        fileName: dependency.fileName,
        outgoingDependencies: dependency.outgoingDependencies,
        incomingDependencies: dependency.incomingDependencies
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
/**
 * Django dependencies converter
 */

import { Graph, Node, Edge, Section, Item } from './types';
import { generateId, createSection, createItem, determineNodeType } from './utils';

interface DjangoField {
  name: string;
  type: string;
  attributes: Record<string, any>;
}

interface DjangoMethod {
  name: string;
  parameters: string[];
}

interface DjangoRelationship {
  field_name: string;
  type: string;
  related_model: string;
  related_name: string | null;
}

interface DjangoModel {
  name: string;
  app: string;
  fields: DjangoField[];
  methods: DjangoMethod[];
  meta: Record<string, any>;
  relationships: DjangoRelationship[];
}

interface DjangoView {
  name: string;
  app: string;
  type: string;
  path?: string;
  http_methods?: string[];
  uses_models?: string[];
  template?: string;
}

interface DjangoApp {
  name: string;
  path: string;
  is_project_app: boolean;
  note?: string;
}

interface DjangoDependencies {
  metadata: {
    projectName: string;
    totalApps: number;
    totalModels: number;
    totalViews: number;
    analyzedAt: string;
    django: {
      version: string;
      debug: boolean;
    };
  };
  apps: DjangoApp[];
  models: DjangoModel[];
  views: DjangoView[];
}

export function convertDjangoDependencies(djangoDependencies: DjangoDependencies): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, string>(); // Maps model/view names to node IDs
  
  // Create app nodes
  djangoDependencies.apps.forEach(app => {
    const nodeId = generateId('django_app', app.name);
    nodeMap.set(`app_${app.name}`, nodeId);
    
    nodes.push({
      id: nodeId,
      title: app.name,
      type: 'app',
      sections: [
        createSection(
          generateId('sec', `${nodeId}_info`),
          'App Info',
          [
            createItem(
              generateId('path', `${app.name}_path`),
              `Path: ${app.path}`,
              'path'
            ),
            createItem(
              generateId('project_app', `${app.name}_project_app`),
              `Project app: ${app.is_project_app}`,
              'info'
            )
          ]
        )
      ],
      metadata: {
        path: app.path,
        is_project_app: app.is_project_app,
        note: app.note
      }
    });
  });
  
  // Create model nodes
  djangoDependencies.models.forEach(model => {
    const nodeId = generateId('django_model', `${model.app}_${model.name}`);
    nodeMap.set(`model_${model.name}`, nodeId);
    
    const sections: Section[] = [];
    
    // Create fields section
    if (model.fields && model.fields.length > 0) {
      const fieldItems = model.fields.map(field => {
        const attributesStr = Object.entries(field.attributes)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join(', ');
        
        return createItem(
          generateId('field', `${model.name}_${field.name}`),
          `${field.name}: ${field.type}${attributesStr ? ` (${attributesStr})` : ''}`,
          'field',
          field.attributes
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_fields`),
        'Fields',
        fieldItems
      ));
    }
    
    // Create methods section
    if (model.methods && model.methods.length > 0) {
      const methodItems = model.methods.map(method => {
        return createItem(
          generateId('method', `${model.name}_${method.name}`),
          `${method.name}(${method.parameters.join(', ')})`,
          'method'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_methods`),
        'Methods',
        methodItems
      ));
    }
    
    // Create relationships section
    if (model.relationships && model.relationships.length > 0) {
      const relationshipItems = model.relationships.map(rel => {
        const relName = rel.related_name ? ` (as ${rel.related_name})` : '';
        
        return createItem(
          generateId('rel', `${model.name}_${rel.field_name}`),
          `${rel.field_name} → ${rel.related_model}${relName} (${rel.type})`,
          'relationship',
          { 
            type: rel.type,
            related_model: rel.related_model,
            related_name: rel.related_name
          }
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_relationships`),
        'Relationships',
        relationshipItems
      ));
    }
    
    nodes.push({
      id: nodeId,
      title: model.name,
      type: 'model',
      sections,
      metadata: {
        app: model.app,
        meta: model.meta
      }
    });
    
    // Add edge from app to model
    const appNodeId = nodeMap.get(`app_${model.app}`);
    if (appNodeId) {
      edges.push({
        source: appNodeId,
        target: nodeId,
        type: 'contains',
        metadata: {
          relationship: 'app_model'
        }
      });
    }
  });
  
  // Create view nodes
  djangoDependencies.views.forEach(view => {
    const nodeId = generateId('django_view', `${view.app}_${view.name}`);
    nodeMap.set(`view_${view.name}`, nodeId);
    
    const sections: Section[] = [];
    
    // Create view info section
    const infoItems: Item[] = [
      createItem(
        generateId('type', `${view.name}_type`),
        `Type: ${view.type}`,
        'info'
      )
    ];
    
    if (view.path) {
      infoItems.push(createItem(
        generateId('path', `${view.name}_path`),
        `Path: ${view.path}`,
        'path'
      ));
    }
    
    if (view.http_methods && view.http_methods.length > 0) {
      infoItems.push(createItem(
        generateId('methods', `${view.name}_http_methods`),
        `HTTP Methods: ${view.http_methods.join(', ')}`,
        'method'
      ));
    }
    
    if (view.template) {
      infoItems.push(createItem(
        generateId('template', `${view.name}_template`),
        `Template: ${view.template}`,
        'template'
      ));
    }
    
    sections.push(createSection(
      generateId('sec', `${nodeId}_info`),
      'View Info',
      infoItems
    ));
    
    // Add model usages
    if (view.uses_models && view.uses_models.length > 0) {
      const modelItems = view.uses_models.map(model => {
        return createItem(
          generateId('uses', `${view.name}_uses_${model}`),
          model,
          'model'
        );
      });
      
      sections.push(createSection(
        generateId('sec', `${nodeId}_models`),
        'Uses Models',
        modelItems
      ));
    }
    
    nodes.push({
      id: nodeId,
      title: view.name,
      type: 'view',
      sections,
      metadata: {
        app: view.app,
        type: view.type,
        path: view.path,
        http_methods: view.http_methods,
        template: view.template
      }
    });
    
    // Add edge from app to view
    const appNodeId = nodeMap.get(`app_${view.app}`);
    if (appNodeId) {
      edges.push({
        source: appNodeId,
        target: nodeId,
        type: 'contains',
        metadata: {
          relationship: 'app_view'
        }
      });
    }
    
    // Add edges from view to models
    if (view.uses_models) {
      view.uses_models.forEach(model => {
        const modelNodeId = nodeMap.get(`model_${model}`);
        if (modelNodeId) {
          edges.push({
            source: nodeId,
            target: modelNodeId,
            type: 'uses',
            metadata: {
              relationship: 'view_model'
            }
          });
        }
      });
    }
  });
  
  // Create edges for model relationships
  djangoDependencies.models.forEach(model => {
    const sourceNodeId = nodeMap.get(`model_${model.name}`);
    
    if (!sourceNodeId) return;
    
    model.relationships.forEach(rel => {
      const targetNodeId = nodeMap.get(`model_${rel.related_model}`);
      
      if (targetNodeId) {
        edges.push({
          source: sourceNodeId,
          target: targetNodeId,
          type: rel.type.toLowerCase(),
          metadata: {
            field_name: rel.field_name,
            related_name: rel.related_name
          }
        });
      }
    });
  });
  
  return {
    nodes,
    edges,
    metadata: {
      projectType: 'django',
      projectName: djangoDependencies.metadata.projectName,
      convertedAt: new Date().toISOString(),
      originalFormat: djangoDependencies.metadata
    }
  };
} 
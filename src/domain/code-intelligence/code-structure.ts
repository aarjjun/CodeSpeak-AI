import type { DocumentUri, SourceRange } from '../shared/source-location';

export interface ParameterStructure {
  readonly name: string;
  readonly type?: string;
  readonly optional: boolean;
}

export interface CallStructure {
  readonly name: string;
  readonly range: SourceRange;
  readonly classification?: 'database' | 'network' | 'file-system' | 'unknown';
  readonly classificationIsInferred: boolean;
}

export interface ControlFlowSummary {
  readonly conditionalCount: number;
  readonly loopCount: number;
  readonly exceptionHandlerCount: number;
}

export interface FunctionStructure {
  readonly name: string;
  readonly range: SourceRange;
  readonly parameters: readonly ParameterStructure[];
  readonly controlFlow: ControlFlowSummary;
  readonly calls: readonly CallStructure[];
  readonly returnDescription?: string;
  readonly returnDescriptionIsInferred: boolean;
}

export interface ClassStructure {
  readonly name: string;
  readonly range: SourceRange;
  readonly methods: readonly FunctionStructure[];
}

export interface ImportStructure {
  readonly moduleName: string;
  readonly importedNames: readonly string[];
  readonly range: SourceRange;
}

export interface CodeStructure {
  readonly uri: DocumentUri;
  readonly languageId: string;
  readonly documentVersion: number;
  readonly imports: readonly ImportStructure[];
  readonly classes: readonly ClassStructure[];
  readonly functions: readonly FunctionStructure[];
  readonly parseErrors: readonly SourceRange[];
}

export interface StructuralSummary {
  readonly title: string;
  readonly lines: readonly string[];
  readonly structure: CodeStructure;
}

import * as ts from 'typescript';
import type { CodeParser } from '../../../application/ports/parsing/code-parser';
import type {
  CallStructure,
  ClassStructure,
  CodeStructure,
  FunctionStructure,
  ImportStructure,
  ParameterStructure,
} from '../../../domain/code-intelligence/code-structure';
import type { OperationResult } from '../../../domain/shared/operation-error';
import type { SourceRange } from '../../../domain/shared/source-location';
import type { WorkspaceDocument } from '../../../domain/workspace/workspace-contracts';

const supportedLanguageIds = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
] as const;

export class TypeScriptAstParser implements CodeParser {
  public readonly supportedLanguageIds: readonly string[] = supportedLanguageIds;
  private readonly cache = new Map<string, CodeStructure>();

  public supports(languageId: string): boolean {
    return supportedLanguageIds.some((supported) => supported === languageId);
  }

  public parse(
    document: WorkspaceDocument,
    signal?: AbortSignal,
  ): Promise<OperationResult<CodeStructure>> {
    if (signal?.aborted === true) {
      return Promise.resolve(this.cancelled());
    }
    if (!this.supports(document.languageId)) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'unsupported-language',
          message: `CodeSpeak does not yet support ${document.languageId} structure analysis.`,
          retryable: false,
          recoveryActions: [],
        },
      });
    }

    const cached = this.cache.get(document.uri);
    if (cached?.documentVersion === document.version) {
      return Promise.resolve({ ok: true, value: cached });
    }

    try {
      const sourceFile = ts.createSourceFile(
        document.uri,
        document.content,
        ts.ScriptTarget.Latest,
        true,
        this.scriptKind(document.languageId),
      );
      const imports: ImportStructure[] = [];
      const classes: ClassStructure[] = [];
      const functions: FunctionStructure[] = [];

      for (const statement of sourceFile.statements) {
        if (this.isCancelled(signal)) {
          return Promise.resolve(this.cancelled());
        }
        if (ts.isImportDeclaration(statement)) {
          imports.push(this.readImport(statement, sourceFile));
        } else if (ts.isClassDeclaration(statement)) {
          classes.push(this.readClass(statement, sourceFile));
        } else if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
          functions.push(this.readFunction(statement.name.text, statement, sourceFile));
        } else if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (
              ts.isIdentifier(declaration.name) &&
              declaration.initializer !== undefined &&
              (ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer))
            ) {
              functions.push(
                this.readFunction(declaration.name.text, declaration.initializer, sourceFile),
              );
            }
          }
        }
      }

      const syntaxDiagnostics =
        ts.transpileModule(document.content, {
          fileName: document.uri,
          reportDiagnostics: true,
          compilerOptions: {
            target: ts.ScriptTarget.Latest,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).diagnostics ?? [];
      const structure: CodeStructure = {
        uri: document.uri,
        languageId: document.languageId,
        documentVersion: document.version,
        imports,
        classes,
        functions,
        parseErrors: syntaxDiagnostics
          .filter((diagnostic) => diagnostic.start !== undefined && diagnostic.length !== undefined)
          .map((diagnostic) =>
            this.rangeFromOffsets(
              sourceFile,
              diagnostic.start ?? 0,
              (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
            ),
          ),
      };
      this.cache.set(document.uri, structure);
      return Promise.resolve({ ok: true, value: structure });
    } catch (error: unknown) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'parse-failure',
          message: 'CodeSpeak could not analyze the current file structure.',
          ...(error instanceof Error ? { technicalMessage: error.message } : {}),
          retryable: true,
          recoveryActions: [],
        },
      });
    }
  }

  public invalidate(uri: string): void {
    this.cache.delete(uri);
  }

  private readImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportStructure {
    const names: string[] = [];
    const clause = node.importClause;
    if (clause?.name !== undefined) {
      names.push(clause.name.text);
    }
    if (clause?.namedBindings !== undefined) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        names.push(clause.namedBindings.name.text);
      } else {
        names.push(...clause.namedBindings.elements.map((element) => element.name.text));
      }
    }
    return {
      moduleName: ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : node.moduleSpecifier.getText(sourceFile),
      importedNames: names,
      range: this.rangeForNode(sourceFile, node),
    };
  }

  private readClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassStructure {
    const methods = node.members
      .filter(ts.isMethodDeclaration)
      .map((method) =>
        this.readFunction(this.nodeName(method.name, sourceFile), method, sourceFile),
      );
    return {
      name: node.name?.text ?? 'anonymous class',
      range: this.rangeForNode(sourceFile, node),
      methods,
    };
  }

  private readFunction(
    name: string,
    node: ts.FunctionLikeDeclaration,
    sourceFile: ts.SourceFile,
  ): FunctionStructure {
    const calls: CallStructure[] = [];
    let conditionalCount = 0;
    let loopCount = 0;
    let exceptionHandlerCount = 0;
    let returnsWithValue = 0;
    let returnsWithoutValue = 0;

    const visit = (child: ts.Node): void => {
      if (child !== node && ts.isFunctionLike(child)) {
        return;
      }
      if (
        ts.isIfStatement(child) ||
        ts.isConditionalExpression(child) ||
        ts.isSwitchStatement(child)
      ) {
        conditionalCount += 1;
      }
      if (
        ts.isForStatement(child) ||
        ts.isForInStatement(child) ||
        ts.isForOfStatement(child) ||
        ts.isWhileStatement(child) ||
        ts.isDoStatement(child)
      ) {
        loopCount += 1;
      }
      if (ts.isCatchClause(child)) {
        exceptionHandlerCount += 1;
      }
      if (ts.isCallExpression(child)) {
        calls.push({
          name: child.expression.getText(sourceFile),
          range: this.rangeForNode(sourceFile, child),
          classification: 'unknown',
          classificationIsInferred: false,
        });
      }
      if (ts.isReturnStatement(child)) {
        if (child.expression === undefined) {
          returnsWithoutValue += 1;
        } else {
          returnsWithValue += 1;
        }
      }
      ts.forEachChild(child, visit);
    };
    if (node.body !== undefined) {
      visit(node.body);
    }

    const returnDescription = this.describeReturns(returnsWithValue, returnsWithoutValue);
    return {
      name,
      range: this.rangeForNode(sourceFile, node),
      parameters: node.parameters.map((parameter) => this.readParameter(parameter, sourceFile)),
      controlFlow: { conditionalCount, loopCount, exceptionHandlerCount },
      calls,
      ...(returnDescription === undefined ? {} : { returnDescription }),
      returnDescriptionIsInferred: false,
    };
  }

  private readParameter(
    node: ts.ParameterDeclaration,
    sourceFile: ts.SourceFile,
  ): ParameterStructure {
    return {
      name: node.name.getText(sourceFile),
      ...(node.type === undefined ? {} : { type: node.type.getText(sourceFile) }),
      optional: node.questionToken !== undefined || node.initializer !== undefined,
    };
  }

  private describeReturns(withValue: number, withoutValue: number): string | undefined {
    if (withValue > 0 && withoutValue > 0) {
      return 'May return a value or return without a value.';
    }
    if (withValue > 0) {
      return 'Returns a value.';
    }
    if (withoutValue > 0) {
      return 'Returns without a value.';
    }
    return undefined;
  }

  private nodeName(name: ts.PropertyName | undefined, sourceFile: ts.SourceFile): string {
    return name?.getText(sourceFile) ?? 'anonymous method';
  }

  private rangeForNode(sourceFile: ts.SourceFile, node: ts.Node): SourceRange {
    return this.rangeFromOffsets(sourceFile, node.getStart(sourceFile), node.getEnd());
  }

  private rangeFromOffsets(sourceFile: ts.SourceFile, start: number, end: number): SourceRange {
    const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
    const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
    return {
      start: { line: startPosition.line, character: startPosition.character },
      end: { line: endPosition.line, character: endPosition.character },
    };
  }

  private scriptKind(languageId: string): ts.ScriptKind {
    switch (languageId) {
      case 'typescriptreact':
        return ts.ScriptKind.TSX;
      case 'javascriptreact':
        return ts.ScriptKind.JSX;
      case 'typescript':
        return ts.ScriptKind.TS;
      default:
        return ts.ScriptKind.JS;
    }
  }

  private cancelled(): OperationResult<never> {
    return {
      ok: false,
      error: {
        code: 'cancelled',
        message: 'Code structure analysis was cancelled.',
        retryable: true,
        recoveryActions: [],
      },
    };
  }

  private isCancelled(signal?: AbortSignal): boolean {
    return signal?.aborted ?? false;
  }
}

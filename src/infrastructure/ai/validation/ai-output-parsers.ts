import type { AiOutputParser } from '../../../domain/ai/ai-contracts';
import type {
  CodeSummaryResult,
  CodeExplanationResult,
  DiagnosticExplanationResult,
  DocumentationGenerationResult,
  GeneratedCodeResult,
} from '../../../domain/ai/ai-results';
import type { OperationResult } from '../../../domain/shared/operation-error';

type JsonObject = Readonly<Record<string, unknown>>;

class JsonOutputParser<TOutput> implements AiOutputParser<TOutput> {
  public constructor(
    public readonly jsonSchema: JsonObject,
    private readonly validator: (value: unknown) => TOutput | undefined,
  ) {}

  public parse(value: unknown): OperationResult<TOutput> {
    const output = this.validator(value);
    if (output !== undefined) {
      return { ok: true, value: output };
    }
    return {
      ok: false,
      error: {
        code: 'invalid-response',
        message: 'Gemini returned a response that CodeSpeak could not safely use.',
        retryable: true,
        recoveryActions: [],
      },
    };
  }
}

const stringProperty = { type: 'string' } as const;
const stringArrayProperty = (maximumItems: number, minimumItems = 0): JsonObject => ({
  type: 'array',
  items: stringProperty,
  minItems: minimumItems,
  maxItems: maximumItems,
});

export const generatedCodeParser = new JsonOutputParser<GeneratedCodeResult>(
  objectSchema({
    code: stringProperty,
    explanation: stringProperty,
    languageId: stringProperty,
  }),
  (value) => {
    const object = asObject(value);
    const code = nonEmptyString(object?.code);
    const explanation = nonEmptyString(object?.explanation);
    const languageId = nonEmptyString(object?.languageId);
    return code === undefined || explanation === undefined || languageId === undefined
      ? undefined
      : { code, explanation, languageId };
  },
);

export const codeExplanationParser = new JsonOutputParser<CodeExplanationResult>(
  objectSchema({
    summary: stringProperty,
    details: stringArrayProperty(12, 1),
    considerations: stringArrayProperty(8),
  }),
  (value) => {
    const object = asObject(value);
    const summary = nonEmptyString(object?.summary);
    const details = stringArray(object?.details, 1, 12);
    const considerations = stringArray(object?.considerations, 0, 8);
    return summary === undefined || details === undefined || considerations === undefined
      ? undefined
      : { summary, details, considerations };
  },
);

export const diagnosticExplanationParser = new JsonOutputParser<DiagnosticExplanationResult>(
  objectSchema({
    plainLanguageExplanation: stringProperty,
    likelyCause: stringProperty,
    suggestedNextSteps: stringArrayProperty(8, 1),
  }),
  (value) => {
    const object = asObject(value);
    const plainLanguageExplanation = nonEmptyString(object?.plainLanguageExplanation);
    const likelyCause = nonEmptyString(object?.likelyCause);
    const suggestedNextSteps = stringArray(object?.suggestedNextSteps, 1, 8);
    return plainLanguageExplanation === undefined ||
      likelyCause === undefined ||
      suggestedNextSteps === undefined
      ? undefined
      : { plainLanguageExplanation, likelyCause, suggestedNextSteps };
  },
);

const documentationStyles = ['docstring', 'jsdoc', 'javadoc', 'doxygen'] as const;

export const documentationGenerationParser = new JsonOutputParser<DocumentationGenerationResult>(
  objectSchema({
    documentation: stringProperty,
    style: { type: 'string', enum: documentationStyles },
    explanation: stringProperty,
  }),
  (value) => {
    const object = asObject(value);
    const documentation = nonEmptyString(object?.documentation);
    const style = documentationStyle(object?.style);
    const explanation = nonEmptyString(object?.explanation);
    return documentation === undefined || style === undefined || explanation === undefined
      ? undefined
      : { documentation, style, explanation };
  },
);

const importantFileSchema = objectSchema({
  path: stringProperty,
  purpose: stringProperty,
});

export const codeSummaryParser = new JsonOutputParser<CodeSummaryResult>(
  objectSchema({
    title: stringProperty,
    overview: stringProperty,
    responsibilities: stringArrayProperty(10, 1),
    architecture: stringArrayProperty(10),
    importantFiles: {
      type: 'array',
      items: importantFileSchema,
      minItems: 0,
      maxItems: 12,
    },
    entryPoints: stringArrayProperty(8),
    cautions: stringArrayProperty(8),
  }),
  (value) => {
    const object = asObject(value);
    const title = nonEmptyString(object?.title);
    const overview = nonEmptyString(object?.overview);
    const responsibilities = stringArray(object?.responsibilities, 1, 10);
    const architecture = stringArray(object?.architecture, 0, 10);
    const importantFiles = importantFileArray(object?.importantFiles);
    const entryPoints = stringArray(object?.entryPoints, 0, 8);
    const cautions = stringArray(object?.cautions, 0, 8);
    return title === undefined ||
      overview === undefined ||
      responsibilities === undefined ||
      architecture === undefined ||
      importantFiles === undefined ||
      entryPoints === undefined ||
      cautions === undefined
      ? undefined
      : {
          title,
          overview,
          responsibilities,
          architecture,
          importantFiles,
          entryPoints,
          cautions,
        };
  },
);

function objectSchema(properties: JsonObject): JsonObject {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function stringArray(
  value: unknown,
  minimumItems: number,
  maximumItems: number,
): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length < minimumItems || value.length > maximumItems) {
    return undefined;
  }
  const strings = value.map(nonEmptyString);
  return strings.some((item) => item === undefined) ? undefined : (strings as readonly string[]);
}

function importantFileArray(value: unknown): CodeSummaryResult['importantFiles'] | undefined {
  if (!Array.isArray(value) || value.length > 12) {
    return undefined;
  }
  const files = value.map((item) => {
    const object = asObject(item);
    const path = nonEmptyString(object?.path);
    const purpose = nonEmptyString(object?.purpose);
    return path === undefined || purpose === undefined ? undefined : { path, purpose };
  });
  return files.some((item) => item === undefined)
    ? undefined
    : (files as CodeSummaryResult['importantFiles']);
}

function documentationStyle(value: unknown): DocumentationGenerationResult['style'] | undefined {
  return typeof value === 'string' && documentationStyles.some((candidate) => candidate === value)
    ? (value as DocumentationGenerationResult['style'])
    : undefined;
}

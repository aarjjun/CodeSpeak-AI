import type { AiProvider } from '../../../application/ports/ai/ai-provider';
import type { AiOutputParser, AiRequest, AiResponse } from '../../../domain/ai/ai-contracts';
import type { OperationResult } from '../../../domain/shared/operation-error';

export class LocalDemoAiProvider implements AiProvider {
  public readonly id = 'codespeak-local-demo';

  public generate<TOutput>(
    request: AiRequest,
    outputParser: AiOutputParser<TOutput>,
  ): Promise<OperationResult<AiResponse<TOutput>>> {
    const parsed = outputParser.parse(this.responseFor(request));
    if (!parsed.ok) return Promise.resolve(parsed);
    return Promise.resolve({
      ok: true,
      value: { output: parsed.value, model: this.id },
    });
  }

  private responseFor(request: AiRequest): unknown {
    switch (request.promptId) {
      case 'learning.assist':
        return this.learningResponse(request.input['question'] ?? 'the requested concept');
      case 'code.generate':
        return {
          code: this.demoCode(request.input['languageId'] ?? 'plaintext'),
          explanation:
            'Demo mode generated a small deterministic example locally. Review it before inserting it.',
          languageId: request.input['languageId'] ?? 'plaintext',
        };
      case 'code.explain':
        return {
          summary: 'This selected code is being explained with the local CodeSpeak demo provider.',
          details: [
            'The demo response proves that intent routing, previews, and spoken feedback are working.',
          ],
          whyItWorks:
            'The response is generated locally and validated with the normal output schema.',
          alternatives: ['Disable demo mode to request a live Gemini explanation.'],
          considerations: ['Demo mode does not perform semantic code analysis.'],
        };
      case 'diagnostic.explain':
        return {
          plainLanguageExplanation:
            'The editor found a problem at this location. Demo mode can show the accessible workflow but cannot infer the exact repair.',
          likelyCause: 'The code does not match a rule enforced by the active language service.',
          suggestedNextSteps: [
            'Read the original diagnostic and inspect the values or types on the reported line.',
          ],
        };
      case 'documentation.generate':
        return {
          documentation: '/** Local CodeSpeak demo documentation. */',
          style: 'jsdoc',
          explanation: 'Demo mode created a local documentation preview.',
          usageExample: 'Call the selected function with valid arguments.',
        };
      case 'summary.generate':
        return {
          title: 'Local demo project summary',
          overview:
            'This summary was created locally to demonstrate accessible previews and spoken output.',
          responsibilities: ['Demonstrate the CodeSpeak summary workflow.'],
          architecture: ['Editor context flows through the CodeSpeak application services.'],
          importantFiles: [],
          entryPoints: [],
          cautions: ['Enable live Gemini mode for semantic project analysis.'],
        };
      case 'voice.classify':
        return { category: 'unknown', content: request.input['transcript'] ?? '' };
      default:
        return {};
    }
  }

  private learningResponse(question: string): Readonly<Record<string, string>> {
    const normalized = question.toLocaleLowerCase();
    if (normalized.includes('recursion')) {
      return {
        explanation:
          'Recursion is when a function solves a problem by calling itself with a smaller version of that problem. It must have a base case that stops the calls.',
        example:
          'A countdown function prints the current number, then calls itself with one less until it reaches zero.',
        exercise:
          'Write a function that adds every number from one through a given positive number.',
        feedback: 'Check that your function has a base case and that each call moves toward it.',
      };
    }
    return {
      explanation: `Demo mode received the question: ${question}. This local response confirms that the learning workflow is available.`,
      example: 'Disable demo mode and configure Gemini to receive a live generated example.',
      exercise: 'Explain the concept in one sentence and create one small example.',
      feedback:
        'A strong answer defines the concept, gives an example, and mentions an important limitation.',
    };
  }

  private demoCode(languageId: string): string {
    if (languageId === 'python') return 'def codespeak_demo():\n    return "Demo mode active"';
    if (languageId === 'javascript' || languageId === 'typescript') {
      return 'function codeSpeakDemo() {\n  return "Demo mode active";\n}';
    }
    return 'CodeSpeak local demo output';
  }
}

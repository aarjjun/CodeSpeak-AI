import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { OperationError } from '../../../domain/shared/operation-error';
import type { SpokenFeedback } from '../../ports/speech/spoken-feedback';

export async function reportAiError(
  error: OperationError,
  userInterface: UserInterfaceGateway,
  spokenFeedback?: SpokenFeedback,
): Promise<void> {
  if (error.code === 'cancelled') {
    if (spokenFeedback === undefined) await userInterface.announce('AI request cancelled.');
    else await spokenFeedback.speak('AI request cancelled.');
    return;
  }
  if (spokenFeedback !== undefined) await spokenFeedback.speak(error.message, 'critical');
  if (error.code === 'configuration' || error.code === 'authentication') {
    await userInterface.showWarning(error.message);
    return;
  }
  await userInterface.showError(error.message);
}

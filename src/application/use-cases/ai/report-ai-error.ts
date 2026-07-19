import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { OperationError } from '../../../domain/shared/operation-error';

export async function reportAiError(
  error: OperationError,
  userInterface: UserInterfaceGateway,
): Promise<void> {
  if (error.code === 'cancelled') {
    await userInterface.announce('AI request cancelled.');
    return;
  }
  if (error.code === 'configuration' || error.code === 'authentication') {
    await userInterface.showWarning(error.message);
    return;
  }
  await userInterface.showError(error.message);
}

import type { ConfigurationGateway } from '../../ports/platform/configuration-gateway';
import type { UserInterfaceGateway } from '../../ports/platform/user-interface-gateway';
import type { AccessibilityProfileId } from '../../../domain/accessibility/accessibility-profile';
import type { AccessibilityProfileCatalog } from '../../../domain/accessibility/accessibility-profile-catalog';

export class SelectAccessibilityProfile {
  public constructor(
    private readonly catalog: AccessibilityProfileCatalog,
    private readonly configuration: ConfigurationGateway,
    private readonly userInterface: UserInterfaceGateway,
  ) {}

  public async execute(): Promise<void> {
    const selected = await this.userInterface.choose(
      'Select an accessibility profile',
      this.catalog.all().map((profile) => ({
        id: profile.id,
        label: profile.name,
        description: this.description(profile.id),
      })),
    );
    if (selected === undefined || !this.isProfileId(selected)) {
      return;
    }

    await this.configuration.setAccessibilityProfile(selected);
    const profile = this.catalog.get(selected);
    await this.userInterface.announce(`${profile.name} enabled.`);
  }

  private description(profileId: AccessibilityProfileId): string {
    switch (profileId) {
      case 'blind':
        return 'Screen-reader-first summaries and progress announcements.';
      case 'low-vision':
        return 'Clear visual presentation with optional spoken support.';
      case 'dyslexia':
        return 'Shorter explanations with structured reading order.';
      case 'motor':
        return 'Stronger confirmation and reduced precision requirements.';
      case 'adhd':
        return 'Brief grouped information with reduced distraction.';
      case 'custom':
        return 'Neutral defaults controlled by individual settings.';
    }
  }

  private isProfileId(value: string): value is AccessibilityProfileId {
    return this.catalog.all().some((profile) => profile.id === value);
  }
}

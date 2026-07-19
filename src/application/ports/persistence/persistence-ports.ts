export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface StateStore {
  get<T>(key: string, defaultValue: T): T;
  set(key: string, value: unknown): Promise<void>;
}

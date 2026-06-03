export interface PlatformAppGeneratorSchema {
  name: string;
  yamlFile: string;
  /** Print a diff of changes without writing to disk. */
  dryRun?: boolean;
  /** Regenerate capabilities provider + add new route stubs; preserve other files. */
  update?: boolean;
  /** Overwrite all scaffold files, including manually edited ones. */
  force?: boolean;
  /** Create an initial git commit after first-time app provisioning. */
  initialCommit?: boolean;
}

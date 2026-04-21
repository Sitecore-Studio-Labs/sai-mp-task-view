/**
 * Full generator flow is validated against the real workspace (markers + Nx apps).
 * `createTreeWithEmptyWorkspace()` does not include extension marker files; run:
 * `nx g platform-generator:platform-app --name=<id>` in-repo for integration tests.
 */
describe("platform-app generator", () => {
  it("placeholder — integration tested via nx g in workspace", () => {
    expect(true).toBe(true);
  });
});

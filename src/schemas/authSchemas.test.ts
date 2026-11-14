import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, setupSchema } from "./authSchemas";

const validSetup = { display_name: "Dr Test", specialty: "Pédiatrie", password: "motdepasse1", confirm: "motdepasse1" };

describe("loginSchema", () => {
  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Le mot de passe est requis");
  });

  it("accepts a non-empty password", () => {
    expect(loginSchema.safeParse({ password: "x" }).success).toBe(true);
  });
});

describe("setupSchema", () => {
  it("accepts valid input", () => {
    expect(setupSchema.safeParse(validSetup).success).toBe(true);
  });

  it("requires name and specialty", () => {
    const result = setupSchema.safeParse({ ...validSetup, display_name: " ", specialty: "" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("display_name");
    expect(paths).toContain("specialty");
  });

  it("rejects short passwords", () => {
    expect(setupSchema.safeParse({ ...validSetup, password: "court", confirm: "court" }).success).toBe(false);
  });

  it("rejects mismatching confirmation on the confirm field", () => {
    const result = setupSchema.safeParse({ ...validSetup, confirm: "autre-chose" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("changePasswordSchema", () => {
  it("requires the current password and matching new passwords", () => {
    expect(changePasswordSchema.safeParse({ current: "", next: "nouveau-mdp", confirm: "nouveau-mdp" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: "old", next: "nouveau-mdp", confirm: "different" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: "old", next: "nouveau-mdp", confirm: "nouveau-mdp" }).success).toBe(true);
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";
import { LoginPage } from "./LoginPage";

function renderLogin(login: AuthContextValue["login"]) {
  const value: AuthContextValue = {
    status: "logged-out",
    doctor: null,
    error: null,
    retry: vi.fn(),
    setup: vi.fn(),
    login,
    unlock: vi.fn(),
    lock: vi.fn(),
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={value}>
      <LoginPage />
    </AuthContext.Provider>,
  );
}

describe("LoginPage", () => {
  it("shows a validation error and does not call login when the password is empty", async () => {
    const login = vi.fn();
    renderLogin(login);
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByText("Le mot de passe est requis")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("submits the typed password", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin(login);
    await userEvent.type(screen.getByLabelText("Mot de passe"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("secret123"));
  });

  it("displays the backend error when login fails", async () => {
    renderLogin(vi.fn().mockRejectedValue("Mot de passe incorrect"));
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mot de passe incorrect");
  });
});

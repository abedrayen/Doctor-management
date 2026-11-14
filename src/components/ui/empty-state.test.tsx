import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(<EmptyState icon={Users} title="Aucun patient" description="Ajoutez un enfant." action={<button>Ajouter</button>} />);
    expect(screen.getByRole("heading", { name: "Aucun patient" })).toBeInTheDocument();
    expect(screen.getByText("Ajoutez un enfant.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeInTheDocument();
  });

  it("omits optional parts", () => {
    render(<EmptyState title="Vide" />);
    expect(screen.getByRole("heading", { name: "Vide" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

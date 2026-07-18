import type { PackagePreset } from "../../types.ts"

export const tanstackStartPackagePresets: readonly PackagePreset[] = [
  {
    id: "tailwind",
    label: "Tailwind CSS",
    description: "Utility-first styling for TanStack Start applications.",
    dependencies: ["clsx"],
    devDependencies: ["tailwindcss"],
    aiRule: {
      prompt:
        "Use Tailwind utilities consistently and extract repeated UI patterns into components.",
      when: "When styling TanStack Start routes, layouts, or shared UI primitives.",
      checklist: [
        "Keep class lists readable and grouped by layout, spacing, color, and state.",
        "Use a shared class-name helper when composing conditional class names.",
        "Avoid duplicating long class combinations across components.",
      ],
    },
  },
  {
    id: "tanstack-query",
    label: "TanStack Query",
    description: "Server-state fetching and cache management for TanStack Start.",
    dependencies: ["@tanstack/react-query"],
    aiRule: {
      prompt: "Use TanStack Query for client-side server state and keep cache keys stable.",
      when: "When caching, mutating, or invalidating remote data beyond route loaders.",
      checklist: [
        "Use structured query keys that include every data dependency.",
        "Prefer route loaders and server functions for route-level data dependencies.",
        "Keep mutation invalidation scoped to affected queries.",
      ],
    },
  },
  {
    id: "tanstack-router",
    label: "TanStack Router",
    description: "Type-safe routing used by TanStack Start.",
    dependencies: ["@tanstack/react-router"],
    aiRule: {
      prompt:
        "Use TanStack Router route definitions as the source of truth for navigation and data loading.",
      when: "When adding routes, route params, search params, loaders, or navigation.",
      checklist: [
        "Keep route params and search params typed through router APIs.",
        "Place route-level data dependencies in loaders when appropriate.",
        "Do not edit generated route tree files manually.",
      ],
    },
  },
  {
    id: "tanstack-form",
    label: "TanStack Form",
    description: "Type-safe headless form state for React.",
    dependencies: ["@tanstack/react-form"],
    aiRule: {
      prompt: "Use TanStack Form for typed form state, validation, and submission workflows.",
      when: "When building non-trivial forms in TanStack Start routes or components.",
      checklist: [
        "Keep default values and field names fully typed.",
        "Define validation at the form or field boundary closest to the constraint.",
        "Submit sensitive mutations through server functions.",
      ],
    },
  },
  {
    id: "tanstack-store",
    label: "TanStack Store",
    description: "Framework-agnostic reactive client state with React bindings.",
    dependencies: ["@tanstack/react-store"],
    aiRule: {
      prompt: "Use TanStack Store for shared client-owned state with granular subscriptions.",
      when: "When UI state must be shared beyond a local component or route boundary.",
      checklist: [
        "Keep server data in loaders or TanStack Query instead of duplicating it in a store.",
        "Subscribe only to the state slice a component needs.",
        "Keep store actions close to the state transitions they implement.",
      ],
    },
  },
  {
    id: "tanstack-table",
    label: "TanStack Table",
    description: "Headless tables and data grids for React.",
    dependencies: ["@tanstack/react-table"],
    aiRule: {
      prompt: "Use TanStack Table for typed, headless table state and rendering.",
      when: "When building sortable, filterable, paginated, or selectable data tables.",
      checklist: [
        "Keep column definitions typed against the row model.",
        "Use controlled state when table filters or pagination belong in the URL.",
        "Keep server-side pagination and sorting aligned with loader or query inputs.",
      ],
    },
  },
  {
    id: "i18n",
    label: "i18next + react-i18next",
    description: "Internationalization for TanStack Start applications.",
    dependencies: ["i18next", "react-i18next"],
    aiRule: {
      prompt: "Use react-i18next translation keys instead of hard-coded user-facing strings.",
      when: "When adding localized text or formatting to TanStack Start routes and components.",
      checklist: [
        "Keep translation keys stable and descriptive.",
        "Use interpolation instead of string concatenation.",
        "Keep locale files organized by route or feature.",
      ],
    },
  },
]

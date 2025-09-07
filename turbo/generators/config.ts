import type { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Component generator
  plop.setGenerator("component", {
    description: "Generate a new React component",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the component?",
      },
      {
        type: "list",
        name: "package",
        message: "Which package should this component be added to?",
        choices: ["web", "ui"],
        default: "web",
      },
    ],
    actions: [
      {
        type: "add",
        path: "{{turbo.paths.root}}/apps/{{package}}/src/components/{{pascalCase name}}/{{pascalCase name}}.tsx",
        templateFile: "templates/component.hbs",
      },
      {
        type: "add",
        path: "{{turbo.paths.root}}/apps/{{package}}/src/components/{{pascalCase name}}/index.ts",
        template: "export { {{pascalCase name}} } from './{{pascalCase name}}';\n",
      },
    ],
  });

  // API route generator
  plop.setGenerator("api-route", {
    description: "Generate a new API route",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the API route? (e.g., 'users' or 'auth/login')",
      },
    ],
    actions: [
      {
        type: "add",
        path: "{{turbo.paths.root}}/apps/web/src/app/api/{{kebabCase name}}/route.ts",
        templateFile: "templates/api-route.hbs",
      },
    ],
  });

  // Package generator
  plop.setGenerator("package", {
    description: "Generate a new package",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the package?",
      },
      {
        type: "input",
        name: "description",
        message: "What is the description of the package?",
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "{{turbo.paths.root}}/packages/{{kebabCase name}}",
        templateFiles: "templates/package/**",
        base: "templates/package",
      },
    ],
  });
}
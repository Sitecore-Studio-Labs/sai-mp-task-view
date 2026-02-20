import type { JiraProject } from "@/types/jira";
import {
  SelectReact,
  type SelectReactOption,
} from "@/components/ui/select-react";

export default function ProjectsList({
  projects,
  onProjectSelect,
}: {
  projects: JiraProject[];
  onProjectSelect: (projectKey: string) => void;
}) {
  const productOptions: SelectReactOption[] = projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));

  return (
    <SelectReact
      options={productOptions}
      placeholder="Select a project"
      aria-label="Select a project"
      onChange={(option) => {
        if (option) onProjectSelect(option.value);
      }}
    />
  );
}

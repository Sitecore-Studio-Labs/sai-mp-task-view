import type { JiraProject } from '@/types/jira';
import {
  SelectReact,
  type SelectReactOption,
} from '@/components/ui/select-react';

export default function ProjectsList({
  projects,
}: {
  projects: JiraProject[];
}) {
  const productOptions: SelectReactOption[] = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  return (
    <SelectReact
      options={productOptions}
      placeholder="Select a project"
      aria-label="Select a project"
    />
  );
}

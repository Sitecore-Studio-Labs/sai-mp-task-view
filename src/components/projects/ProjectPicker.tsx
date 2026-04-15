import { SelectReact, type SelectReactOption } from "@/components/ui/select-react";
import type { PlatformProject } from "@/types/platform-entities";

export type ProjectPickerProps = {
  projects: PlatformProject[];
  selectedProjectKey: string | null;
  onSelectProject: (projectKey: string | null) => void;
  disabled?: boolean;
};

export function ProjectPicker({
  projects,
  selectedProjectKey,
  onSelectProject,
  disabled = false,
}: ProjectPickerProps) {
  const options: SelectReactOption[] = projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));

  const selectedOption = options.find((o) => o.value === selectedProjectKey) ?? null;

  return (
    <SelectReact
      options={options}
      placeholder="Select a project"
      aria-label="Select a project"
      value={selectedOption}
      onChange={(option) => onSelectProject(option?.value ?? null)}
      isDisabled={disabled}
    />
  );
}

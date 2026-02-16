import type { JiraProject } from '@/types/jira';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectsList({
  projects,
}: {
  projects: JiraProject[];
}) {
  return (
    <Card elevation="none" style="outline" className="p-0">
      <ul className="divide-y divide-gray-100">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <Badge variant="bold" className="min-w-16">
              {project.key}
            </Badge>
            <h3 className="text-sm">{project.name}</h3>
          </li>
        ))}
      </ul>
    </Card>
  );
}

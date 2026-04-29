import type { SelectReactOption } from "@/components/ui/select-react";
import { SitecoreSite } from "@/hooks/useSitecoreSites";
import { JiraProject, JiraSite } from "@/types/jira";

export const toSiteSelectOptions = (sites: JiraSite[]): SelectReactOption[] =>
  sites.map((site) => ({
    value: site.id,
    label: site.name,
  }));

export const toProjectSelectOptions = (projects: JiraProject[]): SelectReactOption[] =>
  projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));

export const toWebsiteSelectOptions = (
  websites: SitecoreSite[],
  disabledWebsiteIds?: Set<string>,
): SelectReactOption[] =>
  websites.map((website) => ({
    value: website.id,
    label: website.displayName,
    disabled: disabledWebsiteIds?.has(website.id) ?? false,
  }));

export const getSelectedOption = (
  options: SelectReactOption[],
  value: string | null,
): SelectReactOption | null => options.find((option) => option.value === value) ?? null;

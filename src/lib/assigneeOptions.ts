export type AssigneeDirectoryUser = {
  displayName?: string | null;
  active?: boolean | null;
};

function cleanName(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.map(cleanName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildAssigneeOptions({
  atlassianUsers,
  fallbackOwners,
  currentAssignees = [],
}: {
  atlassianUsers: AssigneeDirectoryUser[];
  fallbackOwners: string[];
  currentAssignees?: string[];
}): string[] {
  const directoryNames = atlassianUsers
    .filter((user) => user.active !== false)
    .map((user) => cleanName(user.displayName))
    .filter(Boolean);
  const primaryNames = directoryNames.length ? directoryNames : fallbackOwners;
  return sortedUnique([...primaryNames, ...currentAssignees]);
}

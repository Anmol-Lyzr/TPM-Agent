export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col overflow-auto app-bg">{children}</div>;
}

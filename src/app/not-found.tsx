import AppStatusView from "@/components/layout/AppStatusView";

export default function NotFound() {
  return (
    <AppStatusView
      variant="not-found"
      eyebrow="404"
      title="រកមិនឃើញទំព័រនេះ"
      description="The page does not exist, may have moved, or the link is no longer valid."
      actions={[
        { label: "Go Home", href: "/", tone: "primary" },
        { label: "Browse Books", href: "/books", tone: "secondary" },
      ]}
    />
  );
}

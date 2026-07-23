import GlobalFloatingActions from "@/components/layout/GlobalFloatingActions";
import PageTransition from "@/components/motion/PageTransition";

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTransition>{children}</PageTransition>
      <GlobalFloatingActions />
    </>
  );
}

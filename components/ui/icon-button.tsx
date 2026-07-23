import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

function IconButton({
  label,
  title,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button size="icon" aria-label={label} title={title} {...props} />
  );
}

export { IconButton };

"use client";

import * as React from "react";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import {
  Group,
  Panel,
  Separator,
  type PanelImperativeHandle,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  orientation,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn(
      "flex h-full w-full",
      orientation === "vertical" && "flex-col",
      className,
    )}
    orientation={orientation}
    {...props}
  />
);

const ResizablePanel = React.forwardRef<
  PanelImperativeHandle | null,
  React.ComponentProps<typeof Panel>
>(function ResizablePanel(props, ref) {
  return <Panel {...props} panelRef={ref} />;
});

const ResizableHandle = ({
  withHandle,
  className,
  onDoubleClick,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
  onDoubleClick?: () => void;
}) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-black/10 dark:bg-white/10 after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90 transition-colors hover:bg-black/20 dark:hover:bg-white/20 cursor-col-resize",
      className,
    )}
    onDoubleClick={onDoubleClick}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border-none bg-black dark:bg-white transition-transform hover:scale-110">
        <DragHandleDots2Icon className="h-2.5 w-1" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

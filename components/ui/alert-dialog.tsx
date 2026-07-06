"use client"

import * as React from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AlertDialogRoot({ ...props }: AlertDialog.Root.Props) {
  return <AlertDialog.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: AlertDialog.Trigger.Props) {
  return <AlertDialog.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: AlertDialog.Portal.Props) {
  return <AlertDialog.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: AlertDialog.Backdrop.Props) {
  return (
    <AlertDialog.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: AlertDialog.Popup.Props) {
  return (
    <AlertDialog.Portal>
      <AlertDialogOverlay />
      <AlertDialog.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg bg-popover p-6 text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:scale-95 data-starting-style:scale-95",
          className
        )}
        {...props}
      />
    </AlertDialog.Portal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialog.Title.Props) {
  return (
    <AlertDialog.Title
      data-slot="alert-dialog-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialog.Description.Props) {
  return (
    <AlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogAction({ ...props }: AlertDialog.Close.Props) {
  return <AlertDialog.Close data-slot="alert-dialog-action" render={<Button />} {...props} />
}

function AlertDialogCancel({ ...props }: AlertDialog.Close.Props) {
  return <AlertDialog.Close data-slot="alert-dialog-cancel" render={<Button variant="outline" />} {...props} />
}

export {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

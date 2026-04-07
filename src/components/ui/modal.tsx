"use client"

import React from "react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ModalProps {
  title: string
  description?: string
  isOpen: boolean
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({
  title,
  description,
  isOpen,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

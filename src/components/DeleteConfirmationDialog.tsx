import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  tournamentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * Confirmation dialog for deleting a tournament
 */
export function DeleteConfirmationDialog({
  isOpen,
  tournamentName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Tournament</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the tournament &quot;{tournamentName}&quot;? This action cannot be undone.
            This will permanently delete the &quot;{tournamentName}&quot; tournament and all of its associated data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting} aria-label="Cancel deletion">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label={`Confirm deletion of ${tournamentName}`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

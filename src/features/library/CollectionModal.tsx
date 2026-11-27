import { CollectionDialog } from './components/CollectionDialog';

interface CollectionModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    description: string;
    color: string;
    icon?: string;
  }) => Promise<unknown>;
}

export function CollectionModal({ open, onClose, onCreate }: CollectionModalProps) {
  return <CollectionDialog open={open} onClose={onClose} onSubmit={onCreate} />;
}

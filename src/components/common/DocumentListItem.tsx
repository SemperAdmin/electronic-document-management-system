import React from 'react';
import { FileTypeIcon, canPreview } from './DocumentPreview';

export interface DocumentListItemProps {
  id: string;
  name: string;
  type?: string;
  uploadedAt: string | Date;
  fileUrl?: string;
  showIcon?: boolean;
  onPreview?: () => void;
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
  name,
  type,
  uploadedAt,
  fileUrl,
  showIcon = false,
  onPreview,
}) => {
  const dateStr = typeof uploadedAt === 'string'
    ? new Date(uploadedAt).toLocaleDateString()
    : uploadedAt.toLocaleDateString();

  const showPreviewButton = onPreview && fileUrl && type && canPreview(type, name);

  return (
    <div className="flex items-center justify-between p-3 border border-brand-navy/20 rounded-lg bg-[var(--surface)]">
      <div className="flex items-center gap-3">
        {showIcon && type && (
          <FileTypeIcon type={type} fileName={name} size="md" />
        )}
        <div className="text-sm text-[var(--muted)]">
          <div className="font-medium text-[var(--text)]">{name}</div>
          <div>{dateStr}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showPreviewButton && (
          <button
            onClick={onPreview}
            className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          >
            Preview
          </button>
        )}
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          >
            Open
          </a>
        ) : (
          <span
            className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded opacity-60"
            aria-disabled="true"
          >
            Open
          </span>
        )}
      </div>
    </div>
  );
};

export type DocumentListItemData = {
  id: string;
  name: string;
  type?: string;
  uploadedAt: string | Date;
  fileUrl?: string;
};

export interface DocumentListProps {
  documents: DocumentListItemData[];
  showIcons?: boolean;
  onPreview?: (doc: DocumentListItemData) => void;
  emptyMessage?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  showIcons = false,
  onPreview,
  emptyMessage = 'No documents',
}) => {
  if (documents.length === 0) {
    return <div className="text-sm text-[var(--muted)]">{emptyMessage}</div>;
  }

  return (
    <>
      {documents.map((doc) => (
        <DocumentListItem
          key={doc.id}
          id={doc.id}
          name={doc.name}
          type={doc.type}
          uploadedAt={doc.uploadedAt}
          fileUrl={doc.fileUrl}
          showIcon={showIcons}
          onPreview={onPreview ? () => onPreview(doc) : undefined}
        />
      ))}
    </>
  );
};

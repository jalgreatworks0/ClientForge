/**
 * Activity Template: Document Uploaded
 * Triggered when a document is uploaded to a record
 */

export const documentUploadedTemplate = {
  id: 'document-uploaded',
  name: 'Document Uploaded',
  category: 'documents',
  priority: 'medium',
  description: 'Activity logged when a document is uploaded',

  generateActivity: (data: any) => ({
    type: 'document.uploaded',
    title: `Document uploaded: ${data.fileName}`,
    description: `${data.userName} uploaded "${data.fileName}" (${data.fileSize})`,
    metadata: {
      documentId: data.documentId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      relatedTo: data.relatedTo,
      relatedId: data.relatedId,
      isPublic: data.isPublic,
    },
    icon: 'file-upload',
    color: '#00BCD4',
  }),

  example: {
    documentId: 'doc-999',
    fileName: 'Contract_Acme_Corp_2025.pdf',
    fileSize: '2.4 MB',
    fileType: 'application/pdf',
    userName: 'Legal Team',
    relatedTo: 'deal',
    relatedId: 'deal-456',
    isPublic: false,
  },
};

// Compliance Documents API Client for Frontend
// Usage: import this file in your React components

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api';

class ComplianceDocumentsAPI {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/compliance-documents`;
  }

  // Upload a compliance document
  async uploadDocument(formData) {
    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData, // FormData should include: file, doctorId, documentType, issueDate, expiryDate, notes
        headers: {
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Get all compliance documents for a doctor
  async getDocumentsByDoctor(doctorId) {
    try {
      const response = await fetch(`${this.baseUrl}/doctor/${doctorId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fetch documents error:', error);
      throw error;
    }
  }

  // Get compliance overview/stats for a doctor
  async getComplianceOverview(doctorId) {
    try {
      const response = await fetch(`${this.baseUrl}/doctor/${doctorId}/overview`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch overview: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fetch overview error:', error);
      throw error;
    }
  }

  // Update document dates
  async updateDocumentDates(documentId, { issueDate, expiryDate }) {
    try {
      const response = await fetch(`${this.baseUrl}/${documentId}/dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ issueDate, expiryDate })
      });

      if (!response.ok) {
        throw new Error(`Failed to update dates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update dates error:', error);
      throw error;
    }
  }

  // Delete a compliance document
  async deleteDocument(documentId) {
    try {
      const response = await fetch(`${this.baseUrl}/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  }

  // Get download URL for a document
  async getDownloadUrl(documentId) {
    try {
      const response = await fetch(`${this.baseUrl}/${documentId}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get download URL error:', error);
      throw error;
    }
  }

  // Helper method to create FormData for file upload
  createUploadFormData(file, doctorId, documentType, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctorId', doctorId);
    formData.append('documentType', documentType);
    
    if (options.issueDate) {
      formData.append('issueDate', options.issueDate);
    }
    if (options.expiryDate) {
      formData.append('expiryDate', options.expiryDate);
    }
    if (options.notes) {
      formData.append('notes', options.notes);
    }

    return formData;
  }

  // Helper method to download file
  async downloadDocument(documentId, fileName) {
    try {
      const response = await this.getDownloadUrl(documentId);
      
      if (response.success) {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = fileName || response.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Failed to get download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const complianceAPI = new ComplianceDocumentsAPI();

// Also export the class for custom instances
export default ComplianceDocumentsAPI;

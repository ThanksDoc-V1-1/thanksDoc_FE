import React, { useState, useEffect } from 'react';
import { FileText, Upload, Check, X, Clock, AlertTriangle, Download, Calendar, FileX, Edit2, Trash2 } from 'lucide-react';
import DateDropdowns from './DateSliders';

export default function BusinessComplianceDocuments({ businessId }) {
  const [documents, setDocuments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(true);
  const [issueDates, setIssueDates] = useState({}); // Store issue dates for each document type

  // Check if user is in dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (businessId) {
      loadDocumentTypes();
      loadDocuments();
    }
  }, [businessId]);

  // Load document types from API
  const loadDocumentTypes = async () => {
    try {
      ('🔄 Loading document types from API...');
      setLoadingDocumentTypes(true);
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/business-compliance-document-types`;
      ('📡 API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      ('📨 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      ('📋 API Result:', result);
      
      if (result.data && Array.isArray(result.data)) {
        // Transform API response to match expected format
        const transformedTypes = result.data.map(docType => ({
          id: docType.key,
          key: docType.key,
          name: docType.name,
          description: docType.description,
          required: docType.required,
          autoExpiry: docType.autoExpiry,
          category: docType.category,
          acceptedFormats: docType.acceptedFormats,
          examples: docType.examples,
          validityYears: docType.validityYears
        }));
        
        ('✅ Transformed document types:', transformedTypes);
        setDocumentTypes(transformedTypes);
      } else {
        ('❌ Invalid API response format:', result);
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('❌ Error loading document types:', error);
      // Fallback to hardcoded types if API fails
      ('🔄 Falling back to hardcoded document types');
      setDocumentTypes(FALLBACK_BUSINESS_DOCUMENT_TYPES);
    } finally {
      setLoadingDocumentTypes(false);
    }
  };

  // Fallback document types in case API fails
  const FALLBACK_BUSINESS_DOCUMENT_TYPES = [
    {
      id: 'business-license',
      name: 'Business License',
      description: 'Valid business registration/license document',
      required: true,
      autoExpiry: true,
      category: 'registration',
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      examples: 'Business registration certificate, trading license'
    },
    {
      id: 'insurance-certificate',
      name: 'Insurance Certificate',
      description: 'Professional liability insurance certificate',
      required: true,
      autoExpiry: true,
      category: 'insurance',
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      examples: 'Professional indemnity insurance, public liability insurance'
    },
    {
      id: 'tax-certificate',
      name: 'Tax Registration Certificate',
      description: 'Tax registration or VAT certificate',
      required: true,
      autoExpiry: true,
      category: 'financial',
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      examples: 'VAT registration, tax identification certificate'
    },
    {
      id: 'health-safety-certificate',
      name: 'Health & Safety Certificate',
      description: 'Health and safety compliance certificate',
      required: true,
      autoExpiry: true,
      category: 'compliance',
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      examples: 'HSE compliance certificate, workplace safety certification'
    },
    {
      id: 'data-protection-certificate',
      name: 'Data Protection Certificate',
      description: 'GDPR/Data protection compliance certificate',
      required: true,
      autoExpiry: true,
      category: 'compliance',
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      examples: 'Data protection certification, GDPR compliance certificate'
    }
  ];

  const loadDocuments = async () => {
    try {
      setLoading(true);
      ('📋 Loading documents for business:', businessId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/business/${businessId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      ('📋 Load documents response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      ('📋 Load documents result:', result);
      
      if (result.success) {
        ('📋 Setting documents:', result.data.documents?.length || 0, 'documents');
        setDocuments(result.data.documents || []);
        setOverview(result.data.overview || null);
      }
    } catch (error) {
      console.error('Error loading business documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (documentType, event) => {
    const file = event.target.files[0];
    if (file) {
      setPendingUploads(prev => ({
        ...prev,
        [documentType]: { file, fileName: file.name }
      }));
    }
  };

  const handleSaveDocument = async (documentId) => {
    const pendingUpload = pendingUploads[documentId];
    if (!pendingUpload || !pendingUpload.file) {
      alert('Please select a file first');
      return;
    }

    setUploadingDoc(documentId);
    
    try {
      const formData = new FormData();
      formData.append('file', pendingUpload.file);
      formData.append('documentType', documentId);
      formData.append('businessId', businessId);
      
      // Get issue date from state
      const issueDate = issueDates[documentId];
      
      if (issueDate) {
        formData.append('issueDate', issueDate);
        
        // Calculate expiry date automatically based on document type validity
        const docType = documentTypes.find(dt => dt.id === documentId);
        const validityYears = docType?.validityYears || 1; // Default to 1 year if not specified
        
        (`🔍 Looking for document type with id: ${documentId}`);
        (`📋 Found document type:`, docType);
        (`⏰ Validity years:`, validityYears);
        
        const issueDateObj = new Date(issueDate);
        const expiryDate = new Date(issueDateObj);
        expiryDate.setFullYear(expiryDate.getFullYear() + validityYears);
        
        // Format expiry date as YYYY-MM-DD
        const expiryDateString = expiryDate.toISOString().split('T')[0];
        formData.append('expiryDate', expiryDateString);
        
        (`📅 Auto-calculated expiry date for ${documentId}:`, {
          issueDate: issueDate,
          validityYears,
          expiryDate: expiryDateString
        });
      } else {
        alert('Please select an issue date');
        setUploadingDoc(null);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Refresh the documents to show updated status
      await loadDocuments();
      
      // Clear the pending upload, editing state, and issue date
      setPendingUploads(prev => {
        const updated = { ...prev };
        delete updated[documentId];
        return updated;
      });
      setIssueDates(prev => {
        const updated = { ...prev };
        delete updated[documentId];
        return updated;
      });
      setEditingDoc(null);
      
      ('Business document uploaded successfully:', result);
      
    } catch (error) {
      console.error('Error uploading business document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setDeletingDoc(documentId);
    
    try {
      const doc = documents.find(d => d.documentType === documentId);
      if (!doc) {
        throw new Error('Document not found');
      }

      ('🗑️ Deleting document:', doc.documentId, 'for document type:', documentId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/business-compliance-documents/${doc.documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      ('🗑️ Delete response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🗑️ Delete failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      ('✅ Document deleted successfully, refreshing documents...');

      // Refresh the documents to show updated status
      await loadDocuments();
      
      ('🔄 Documents reloaded after deletion');
      
    } catch (error) {
      console.error('Error deleting business document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeletingDoc(null);
    }
  };

  const getDocumentStatus = (docConfig) => {
    const doc = documents.find(d => d.documentType === docConfig.id);
    
    if (!doc) {
      return 'missing';
    }
    
    // Check if expired
    if (doc.autoExpiry && doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const today = new Date();
      
      if (expiryDate < today) {
        return 'expired';
      }
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) {
        return 'expiring';
      }
    }
    
    return 'uploaded';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'missing':
        return isDarkMode 
          ? 'border-red-600 bg-red-900/10 text-red-400' 
          : 'border-red-300 bg-red-50 text-red-600';
      case 'uploaded':
        return isDarkMode 
          ? 'border-green-600 bg-green-900/10 text-green-400' 
          : 'border-green-300 bg-green-50 text-green-600';
      case 'expiring':
        return isDarkMode 
          ? 'border-yellow-600 bg-yellow-900/10 text-yellow-400' 
          : 'border-yellow-300 bg-yellow-50 text-yellow-600';
      case 'expired':
        return isDarkMode 
          ? 'border-red-600 bg-red-900/10 text-red-400' 
          : 'border-red-300 bg-red-50 text-red-600';
      default:
        return isDarkMode 
          ? 'border-gray-600 bg-gray-900/10 text-gray-400' 
          : 'border-gray-300 bg-gray-50 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'missing':
        return <FileX className="h-3 w-3" />;
      case 'uploaded':
        return <Check className="h-3 w-3" />;
      case 'expiring':
        return <AlertTriangle className="h-3 w-3" />;
      case 'expired':
        return <X className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getStatusText = (status, docId) => {
    switch (status) {
      case 'missing':
        return 'Required';
      case 'uploaded':
        return 'Uploaded';
      case 'expiring':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return isDarkMode 
          ? 'border-green-600 bg-green-900/10 text-green-400' 
          : 'border-green-300 bg-green-50 text-green-600';
      case 'rejected':
        return isDarkMode 
          ? 'border-red-600 bg-red-900/10 text-red-400' 
          : 'border-red-300 bg-red-50 text-red-600';
      case 'pending':
      default:
        return isDarkMode 
          ? 'border-yellow-600 bg-yellow-900/10 text-yellow-400' 
          : 'border-yellow-300 bg-yellow-50 text-yellow-600';
    }
  };

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <Check className="h-3 w-3" />;
      case 'rejected':
        return <X className="h-3 w-3" />;
      case 'pending':
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getVerificationStatusText = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Under Review';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading || loadingDocumentTypes) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow`}>
        <div className="animate-pulse">
          <div className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-4`}></div>
          <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`}></div>
          <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border`}>
      <div className="mb-6">
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          Business Compliance Documents
        </h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Upload and manage your business compliance documents. All documents are required for business verification.
        </p>
        
        {overview && (
          <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Compliance Progress
                </span>
                <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mt-1`}>
                  {overview.stats.uploaded} of {overview.stats.total} documents uploaded
                </div>
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                {overview.completionPercentage}%
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {documentTypes.map((docConfig) => {
          const doc = documents.find(d => d.documentType === docConfig.id);
          const status = getDocumentStatus(docConfig);
          const isExpanded = expandedDoc === docConfig.id;
          const hasPendingUpload = pendingUploads[docConfig.id];
          const isEditing = editingDoc === docConfig.id;
          const showUploadSection = !doc || isEditing;

          return (
            <div
              key={docConfig.id}
              className={`border rounded-lg ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50/50'}`}
            >
              <div
                className={`p-4 cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
                onClick={() => setExpandedDoc(isExpanded ? null : docConfig.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <div>
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {docConfig.name}
                          {docConfig.required && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {docConfig.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Document Status */}
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                      <span>{getStatusText(status, docConfig.id)}</span>
                    </div>
                    
                    {/* Verification Status - Only show for uploaded documents */}
                    {status === 'uploaded' && doc && (
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getVerificationStatusColor(doc.verificationStatus || 'pending')}`}>
                        {getVerificationStatusIcon(doc.verificationStatus || 'pending')}
                        <span>{getVerificationStatusText(doc.verificationStatus || 'pending')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className={`border-t p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  
                  {/* Current Document Status */}
                  {doc && (
                    <div className={`mb-4 p-3 rounded ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Current Document
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!isEditing && (
                            <button
                              onClick={() => setEditingDoc(docConfig.id)}
                              className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors`}
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Update</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(docConfig.id)}
                            disabled={deletingDoc === docConfig.id}
                            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-red-900 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'} transition-colors disabled:opacity-50`}
                          >
                            {deletingDoc === docConfig.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          <strong>File:</strong> {doc.fileName}
                        </div>
                        <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          <strong>Uploaded:</strong> {formatDate(doc.uploadedAt)}
                        </div>
                        {doc.issueDate && (
                          <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            <strong>Issue Date:</strong> {formatDate(doc.issueDate)}
                          </div>
                        )}
                        {doc.expiryDate && (
                          <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            <strong>Expiry Date:</strong> {formatDate(doc.expiryDate)}
                            <span className={`ml-2 text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                              Auto-calculated
                            </span>
                          </div>
                        )}
                        <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          <strong>Verification Status:</strong> {getVerificationStatusText(doc.verificationStatus || 'pending')}
                        </div>
                      </div>
                      
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center space-x-1 mt-2 px-3 py-1 text-xs rounded ${isDarkMode ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors`}
                        >
                          <Download className="h-3 w-3" />
                          <span>View Document</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Upload Section - Only show if no document exists or editing */}
                  {showUploadSection && (
                    <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc ? 'Replace Document' : 'Upload Document'}
                        </h4>
                        {isEditing && (
                          <button
                            onClick={() => {
                              setEditingDoc(null);
                              setPendingUploads(prev => {
                                const updated = { ...prev };
                                delete updated[docConfig.id];
                                return updated;
                              });
                            }}
                            className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'} transition-colors`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {/* File Selection */}
                        <div>
                          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                            Select File
                          </label>
                          <input
                            type="file"
                            accept={docConfig.acceptedFormats}
                            onChange={(e) => handleFileSelect(docConfig.id, e)}
                            className={`w-full px-3 py-2 border rounded ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                          />
                          {hasPendingUpload && (
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                              Selected: {hasPendingUpload.fileName}
                            </p>
                          )}
                        </div>

                        {/* Date Fields */}
                        <div className="grid grid-cols-1 gap-3">
                          <DateDropdowns
                            label="Issue Date *"
                            value={issueDates[docConfig.id] || (doc?.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : '')}
                            onChange={(dateString) => {
                              setIssueDates(prev => ({
                                ...prev,
                                [docConfig.id]: dateString
                              }));
                            }}
                          />
                          <div className={`p-3 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded`}>
                            <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                              <strong>Auto-Expiry:</strong> This document will automatically expire {docConfig.validityYears || 1} year(s) after the issue date.
                            </p>
                          </div>
                        </div>

                        {/* Upload Button */}
                        <button
                          onClick={() => handleSaveDocument(docConfig.id)}
                          disabled={!hasPendingUpload || uploadingDoc === docConfig.id}
                          className={`w-full px-4 py-2 rounded font-medium transition-colors ${
                            hasPendingUpload && uploadingDoc !== docConfig.id
                              ? isDarkMode
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                              : isDarkMode
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {uploadingDoc === docConfig.id ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Uploading...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Upload className="h-4 w-4" />
                              <span>{doc ? 'Replace Document' : 'Upload Document'}</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

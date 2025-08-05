'use client';

import { useState, useEffect } from 'react';
import { FileText, Upload, Calendar, AlertTriangle, CheckCircle, X, Download, Eye, ChevronDown, ChevronRight, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import DateDropdowns from './DateSliders';

// Compliance documents configuration with automatic expiry dates for training certificates
const COMPLIANCE_DOCUMENTS = [
  {
    id: 'gmc_registration',
    name: 'GMC Registration Certificate',
    type: 'certificate',
    required: true,
    autoExpiry: false
  },
  {
    id: 'current_performers_list',
    name: 'Current Performers List',
    type: 'document',
    required: true,
    autoExpiry: false
  },
  {
    id: 'cct_certificate',
    name: 'Certificate for completion of training (CCT)',
    type: 'certificate',
    required: true,
    autoExpiry: false
  },
  {
    id: 'medical_indemnity',
    name: 'Medical Indemnity Insurance',
    type: 'insurance',
    required: true,
    autoExpiry: false
  },
  {
    id: 'dbs_check',
    name: 'Enhanced DBS (Disclosure and Barring Service) Check',
    type: 'check',
    required: true,
    autoExpiry: false
  },
  {
    id: 'right_to_work',
    name: 'Right to Work in the UK (Passport/Visa if applicable)',
    type: 'identity',
    required: true,
    autoExpiry: false
  },
  {
    id: 'photo_id',
    name: 'Photo ID (Passport or UK Driving Licence)',
    type: 'identity',
    required: true,
    autoExpiry: false,
    note: 'For identity verification'
  },
  {
    id: 'gp_cv',
    name: 'GP CV',
    type: 'document',
    required: true,
    autoExpiry: false
  },
  {
    id: 'occupational_health',
    name: 'Occupational Health Clearance',
    type: 'clearance',
    required: true,
    autoExpiry: false,
    note: 'Proof of immunisations'
  },
  {
    id: 'professional_references',
    name: 'Professional References',
    type: 'document',
    required: true,
    autoExpiry: false,
    note: '2 references (including 1 clinical) from the past two years'
  },
  {
    id: 'appraisal_revalidation',
    name: 'Appraisal & Revalidation Evidence',
    type: 'document',
    required: true,
    autoExpiry: false
  },
  // Mandatory Training Certificates with automatic expiry
  {
    id: 'basic_life_support',
    name: 'Basic Life Support (BLS) + Anaphylaxis',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'level3_adult_safeguarding',
    name: 'Level 3 Adult Safeguarding',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  },
  {
    id: 'level3_child_safeguarding',
    name: 'Level 3 Child Safeguarding',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  },
  {
    id: 'information_governance',
    name: 'Information Governance (IG) & GDPR',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'autism_learning_disability',
    name: 'Autism and Learning Disability (Oliver McGowen)',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  },
  {
    id: 'equality_diversity',
    name: 'Equality, Diversity and Human Rights',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  },
  {
    id: 'health_safety_welfare',
    name: 'Health, Safety and Welfare',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'conflict_resolution',
    name: 'Conflict Resolution and Handling Complaints',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  },
  {
    id: 'fire_safety',
    name: 'Fire Safety',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'infection_prevention',
    name: 'Infection Prevention and Control',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'moving_handling',
    name: 'Moving and Handling',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 1,
    note: 'Annual renewal required'
  },
  {
    id: 'preventing_radicalisation',
    name: 'Preventing Radicalisation',
    type: 'training',
    required: true,
    autoExpiry: true,
    validityYears: 3,
    note: 'Valid for 3 years'
  }
];

export default function ComplianceDocuments({ doctorId }) {
  const { isDarkMode } = useTheme();
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [expandedDocuments, setExpandedDocuments] = useState({});
  const [pendingUploads, setPendingUploads] = useState({}); // Store files before upload
  const [uploadSuccess, setUploadSuccess] = useState({}); // Track upload success states

  // Initialize documents state
  useEffect(() => {
    loadDocuments();
  }, [doctorId]);

  const loadDocuments = async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api'}/compliance-documents/doctor/${doctorId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Convert array to object keyed by documentType for easier access
          const docsByType = {};
          result.data.documents.forEach(doc => {
            docsByType[doc.documentType] = {
              ...doc,
              files: [{
                id: doc.id,
                name: doc.originalFileName,
                size: doc.fileSize,
                uploadDate: doc.uploadedAt
              }]
            };
          });
          setDocuments(docsByType);
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      // Fallback to localStorage for development
      const savedDocs = localStorage.getItem(`compliance_docs_${doctorId}`);
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveDocuments = async (newDocuments) => {
    // Save to localStorage as backup
    localStorage.setItem(`compliance_docs_${doctorId}`, JSON.stringify(newDocuments));
    setDocuments(newDocuments);
  };

  const handleFileUpload = async (documentId, files) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Only handle one file
    
    // Store file in pendingUploads instead of uploading immediately
    setPendingUploads(prev => ({
      ...prev,
      [documentId]: {
        file,
        expiryDate: documents[documentId]?.expiryDate || null
      }
    }));
    
    // Clear any previous success state
    setUploadSuccess(prev => ({
      ...prev,
      [documentId]: false
    }));
  };

  const handleVerifyDocument = async (documentId, verificationStatus, notes = '') => {
    try {
      setUploadingDoc(documentId);
      
      const response = await fetch(`http://localhost:1337/api/compliance-documents/${documentId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationStatus,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Refresh the documents to show updated verification status
      await loadDocuments();
      
      console.log('Document verification updated:', result);
      
    } catch (error) {
      console.error('Error updating verification status:', error);
      alert('Failed to update verification status. Please try again.');
    } finally {
      setUploadingDoc(null);
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
      formData.append('file', pendingUpload.file); // Changed from 'files' to 'file'
      formData.append('documentType', documentId); // Changed from 'docType' to 'documentType'
      formData.append('doctorId', doctorId);

      // Add dates if available
      const existingDoc = documents[documentId];
      if (existingDoc?.issueDate) {
        formData.append('issueDate', existingDoc.issueDate);
      }
      if (pendingUpload.expiryDate || existingDoc?.expiryDate) {
        formData.append('expiryDate', pendingUpload.expiryDate || existingDoc.expiryDate);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api'}/compliance-documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show success state
          setUploadSuccess(prev => ({
            ...prev,
            [documentId]: true
          }));

          // Clear pending upload
          setPendingUploads(prev => {
            const newPending = { ...prev };
            delete newPending[documentId];
            return newPending;
          });

          // Hide success message after 3 seconds
          setTimeout(() => {
            setUploadSuccess(prev => ({
              ...prev,
              [documentId]: false
            }));
          }, 3000);

          // Refresh documents to show the uploaded file
          await loadDocuments();
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDateChange = async (documentId, field, value) => {
    const docConfig = COMPLIANCE_DOCUMENTS.find(d => d.id === documentId);
    const newDocuments = { ...documents };
    
    if (!newDocuments[documentId]) {
      newDocuments[documentId] = {};
    }

    newDocuments[documentId][field] = value;

    // Auto-calculate expiry date for training certificates
    if (field === 'issueDate' && docConfig.autoExpiry && docConfig.validityYears && value) {
      const issueDate = new Date(value);
      const expiryDate = new Date(issueDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + docConfig.validityYears);
      newDocuments[documentId].expiryDate = expiryDate.toISOString().split('T')[0];
    }

    saveDocuments(newDocuments);

    // If document exists in database, update it via API
    if (newDocuments[documentId].id) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api'}/compliance-documents/${newDocuments[documentId].id}/dates`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            issueDate: newDocuments[documentId].issueDate,
            expiryDate: newDocuments[documentId].expiryDate
          })
        });

        if (!response.ok) {
          console.error('Failed to update dates on server');
        }
      } catch (error) {
        console.error('Error updating dates:', error);
      }
    }
  };

  const removeFile = async (documentId, fileId) => {
    try {
      const doc = documents[documentId];
      if (doc && doc.id) {
        // Delete from server
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api'}/compliance-documents/${doc.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Remove from local state
          const newDocuments = { ...documents };
          delete newDocuments[documentId];
          saveDocuments(newDocuments);
        } else {
          throw new Error('Failed to delete document');
        }
      } else {
        // Local file only, remove from state
        const newDocuments = { ...documents };
        if (newDocuments[documentId]?.files) {
          newDocuments[documentId].files = newDocuments[documentId].files.filter(f => f.id !== fileId);
          if (newDocuments[documentId].files.length === 0) {
            delete newDocuments[documentId];
          }
        }
        saveDocuments(newDocuments);
      }
    } catch (error) {
      console.error('Error removing file:', error);
      alert('Error removing file. Please try again.');
    }
  };

  const getDocumentStatus = (documentId) => {
    const doc = documents[documentId];
    const config = COMPLIANCE_DOCUMENTS.find(d => d.id === documentId);
    
    if (!doc || !doc.files || doc.files.length === 0) {
      return 'missing';
    }

    if (config.autoExpiry && doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        return 'expired';
      } else if (daysUntilExpiry <= 30) {
        return 'expiring';
      }
    }

    return 'uploaded';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded':
        return isDarkMode 
          ? 'text-green-400 bg-green-900/20 border-green-800' 
          : 'text-green-600 bg-green-50 border-green-200';
      case 'missing':
        return isDarkMode 
          ? 'text-red-400 bg-red-900/20 border-red-800' 
          : 'text-red-600 bg-red-50 border-red-200';
      case 'expiring':
        return isDarkMode 
          ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800' 
          : 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'expired':
        return isDarkMode 
          ? 'text-red-400 bg-red-900/20 border-red-800' 
          : 'text-red-600 bg-red-50 border-red-200';
      default:
        return isDarkMode 
          ? 'text-gray-400 bg-gray-800 border-gray-700' 
          : 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-4 w-4" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4" />;
      case 'expiring':
        return <AlertTriangle className="h-4 w-4" />;
      case 'expired':
        return <X className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status, documentId) => {
    const doc = documents[documentId];
    switch (status) {
      case 'uploaded':
        return 'Uploaded';
      case 'missing':
        return 'Missing';
      case 'expiring':
        if (doc?.expiryDate) {
          const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
          return `Expires in ${daysUntilExpiry} days`;
        }
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      default:
        return 'Pending';
    }
  };

  // Verification status helper functions
  const getVerificationStatusColor = (verificationStatus) => {
    switch (verificationStatus) {
      case 'verified':
        return isDarkMode 
          ? 'text-green-400 bg-green-900/20 border-green-800' 
          : 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return isDarkMode 
          ? 'text-red-400 bg-red-900/20 border-red-800' 
          : 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
      default:
        return isDarkMode 
          ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800' 
          : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getVerificationStatusIcon = (verificationStatus) => {
    switch (verificationStatus) {
      case 'verified':
        return <CheckCircle className="h-3 w-3" />;
      case 'rejected':
        return <X className="h-3 w-3" />;
      case 'pending':
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getVerificationStatusText = (verificationStatus) => {
    switch (verificationStatus) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Invalid';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleDocumentExpansion = (documentId) => {
    setExpandedDocuments(prev => ({
      ...prev,
      [documentId]: !prev[documentId]
    }));
  };

  const getComplianceStats = () => {
    let uploaded = 0;
    let missing = 0;
    let expiring = 0;
    let expired = 0;

    COMPLIANCE_DOCUMENTS.forEach(docConfig => {
      const status = getDocumentStatus(docConfig.id);
      switch (status) {
        case 'uploaded':
          uploaded++;
          break;
        case 'missing':
          missing++;
          break;
        case 'expiring':
          expiring++;
          break;
        case 'expired':
          expired++;
          break;
      }
    });

    return { uploaded, missing, expiring, expired, total: COMPLIANCE_DOCUMENTS.length };
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} rounded-lg shadow border p-4 lg:p-6`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#EF4444'}}>
          <FileText className={`h-5 w-5`} style={{color: isDarkMode ? '#EF4444' : 'white'}} />
        </div>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Compliance Documents
        </h3>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading documents...
          </p>
        </div>
      ) : (
        <div>
          {/* Compliance Overview */}
          <div className={`mb-6 p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Compliance Overview
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const stats = getComplianceStats();
                return (
                  <>
                    <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                      <div className={`text-lg font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {stats.uploaded}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        Uploaded
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                      <div className={`text-lg font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {stats.missing}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Missing
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                      <div className={`text-lg font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {stats.expiring}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                        Expiring
                      </div>
                    </div>
                    <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                      <div className={`text-lg font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {stats.expired}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Expired
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Documents: {getComplianceStats().total} • Click on any document to expand details
            </div>
          </div>

          <div className="space-y-4">
            {COMPLIANCE_DOCUMENTS.map((docConfig) => {
              const doc = documents[docConfig.id];
              const status = getDocumentStatus(docConfig.id);
              const isExpanded = expandedDocuments[docConfig.id];
              
              return (
                <div key={docConfig.id} className={`border rounded-lg ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  {/* Document Header - Always Visible and Clickable */}
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleDocumentExpansion(docConfig.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center">
                        {isExpanded ? (
                          <ChevronDown className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        ) : (
                          <ChevronRight className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {docConfig.name}
                          {docConfig.required && <span className="text-red-500 ml-1">*</span>}
                        </h4>
                        {docConfig.note && (
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {docConfig.note}
                          </p>
                        )}
                        {/* Display Issue and Expiry dates if available */}
                        {doc && (doc.issueDate || doc.expiryDate) && (
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {doc.issueDate && (
                              <span>Issue: {formatDate(doc.issueDate)}</span>
                            )}
                            {doc.issueDate && doc.expiryDate && <span className="mx-2">•</span>}
                            {doc.expiryDate && (
                              <span>Expiry: {formatDate(doc.expiryDate)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Upload Status Pill */}
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span>{getStatusText(status, docConfig.id)}</span>
                      </div>
                      
                      {/* Verification Status Pill - Only show for uploaded documents */}
                      {status === 'uploaded' && doc && (
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getVerificationStatusColor(doc.verificationStatus || 'pending')}`}>
                          {getVerificationStatusIcon(doc.verificationStatus || 'pending')}
                          <span>{getVerificationStatusText(doc.verificationStatus || 'pending')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Content */}
                  {isExpanded && (
                    <div className={`border-t p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {/* File Upload */}
                      <div className="mb-4">
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Upload Documents
                        </label>
                        <div className="space-y-3">
                          {/* File Input */}
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleFileUpload(docConfig.id, e.target.files)}
                              className="hidden"
                              id={`file-upload-${docConfig.id}`}
                              disabled={uploadingDoc === docConfig.id}
                            />
                            <label
                              htmlFor={`file-upload-${docConfig.id}`}
                              className={`flex items-center justify-center px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                uploadingDoc === docConfig.id
                                  ? 'opacity-50 cursor-not-allowed'
                                  : isDarkMode
                                    ? 'border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50'
                                    : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <Upload className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  Choose file or drag & drop
                                </span>
                              </div>
                            </label>
                          </div>

                          {/* Selected File Preview */}
                          {pendingUploads[docConfig.id]?.file && (
                            <div className={`p-3 rounded border ${
                              isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-blue-200 bg-blue-50'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <FileText className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                    {pendingUploads[docConfig.id].file.name}
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {formatFileSize(pendingUploads[docConfig.id].file.size)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setPendingUploads(prev => {
                                      const newPending = { ...prev };
                                      delete newPending[docConfig.id];
                                      return newPending;
                                    });
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-600'
                                  }`}
                                  title="Remove selected file"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Fields */}
                      <div className="space-y-4 mb-4">
                        <DateDropdowns
                          label="Issue Date"
                          value={doc?.issueDate || ''}
                          onChange={(dateString) => handleDateChange(docConfig.id, 'issueDate', dateString)}
                        />
                        
                        <DateDropdowns
                          label="Expiry Date"
                          value={doc?.expiryDate || ''}
                          onChange={(dateString) => {
                            if (pendingUploads[docConfig.id]) {
                              setPendingUploads(prev => ({
                                ...prev,
                                [docConfig.id]: {
                                  ...prev[docConfig.id],
                                  expiryDate: dateString
                                }
                              }));
                            }
                            handleDateChange(docConfig.id, 'expiryDate', dateString);
                          }}
                          disabled={docConfig.autoExpiry}
                          autoCalculated={docConfig.autoExpiry}
                        />
                      </div>

                      {/* Save Button */}
                      {pendingUploads[docConfig.id]?.file && (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSaveDocument(docConfig.id)}
                            disabled={uploadingDoc === docConfig.id}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              uploadingDoc === docConfig.id
                                ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {uploadingDoc === docConfig.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Uploading...</span>
                              </div>
                            ) : (
                              'Save Document'
                            )}
                          </button>

                          {uploadSuccess[docConfig.id] && (
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Upload successful!</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Uploaded Files */}
                      {doc?.files && doc.files.length > 0 && (
                        <div className="mb-4">
                          <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Uploaded Files ({doc.files.length})
                          </h5>
                          <div className="space-y-2">
                            {doc.files.map((file) => (
                              <div key={file.id} className={`flex items-center justify-between p-3 rounded border ${
                                isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-white'
                              }`}>
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <FileText className={`h-4 w-4 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {file.name}
                                    </p>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatFileSize(file.size)} • Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(docConfig.id, file.id);
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-600'
                                  }`}
                                  title="Remove file"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Verification Controls - Only show for uploaded documents */}
                      {status === 'uploaded' && doc && (
                        <div className="mb-4">
                          <h5 className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Admin Verification
                          </h5>
                          <div className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Shield className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Current Status: 
                                </span>
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getVerificationStatusColor(doc.verificationStatus || 'pending')}`}>
                                  {getVerificationStatusIcon(doc.verificationStatus || 'pending')}
                                  <span>{getVerificationStatusText(doc.verificationStatus || 'pending')}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Verification Action Buttons */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'verified')}
                                disabled={uploadingDoc === doc.id || doc.verificationStatus === 'verified'}
                                className={`flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                  uploadingDoc === doc.id || doc.verificationStatus === 'verified'
                                    ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                <ShieldCheck className="h-3 w-3" />
                                <span>Verify</span>
                              </button>
                              
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'rejected')}
                                disabled={uploadingDoc === doc.id || doc.verificationStatus === 'rejected'}
                                className={`flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                  uploadingDoc === doc.id || doc.verificationStatus === 'rejected'
                                    ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                              >
                                <ShieldX className="h-3 w-3" />
                                <span>Reject</span>
                              </button>
                              
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'pending')}
                                disabled={uploadingDoc === doc.id || doc.verificationStatus === 'pending'}
                                className={`flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                                  uploadingDoc === doc.id || doc.verificationStatus === 'pending'
                                    ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500'
                                    : isDarkMode 
                                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                }`}
                              >
                                <Shield className="h-3 w-3" />
                                <span>Reset to Pending</span>
                              </button>
                            </div>

                            {/* Verification Details */}
                            {doc.verifiedBy && (
                              <div className={`mt-3 pt-3 border-t text-xs ${isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                <p>Verified by: {doc.verifiedBy}</p>
                                {doc.verifiedAt && (
                                  <p>Verified on: {new Date(doc.verifiedAt).toLocaleDateString()} at {new Date(doc.verifiedAt).toLocaleTimeString()}</p>
                                )}
                                {doc.notes && (
                                  <p className="mt-1">Notes: {doc.notes}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-4 p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
            }`}>
              <p className="mb-1">
                <span className="text-red-500">*</span> Required documents for compliance
              </p>
              <p>Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB per file)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}